from flask import render_template, redirect, request, session, url_for, jsonify
from bson import ObjectId
import datetime
import traceback

def register_routes(app, deps):
    users = deps.get("users")
    pitches = deps.get("pitches")
    portfolio = deps.get("portfolio")
    preferences = deps.get("preferences")
    investor_feed = deps.get("investor_feed")
    summaries = deps.get("summaries")
    investor_ent_matches = deps.get("investor_ent_matches")
    investor_maybe = deps.get("investor_maybe")
    investor_rejections = deps.get("investor_rejections")
    investor_feed_blocker = deps.get("investor_feed_blocker")
    get_investor_analytics = deps.get("get_investor_analytics")
    get_investment_opportunities = deps.get("get_investment_opportunities")

    # ==================== INVESTOR ROUTES ==================== 

    @app.route("/dashboard/investor")
    def dashboard_investor():
        if "user_id" not in session or session.get("role") != "investor":
            return redirect(url_for("login"))
        
        user_id = ObjectId(session["user_id"])
        user = users.find_one({"_id": user_id})
        
        try:
            opportunities = get_investment_opportunities(user_id)
            investment_portfolio = list(portfolio.find({"investor_id": user_id}).sort("investment_date", -1))
            analytics_data = get_investor_analytics(user_id)
            user_preferences = preferences.find_one({"user_id": user_id}) or {}
            
            # Ensure analytics data has all required fields
            default_analytics = {
                "opportunities_reviewed": 0,
                "pitches_saved": 0,
                "active_investments": 0,
                "avg_match_rate": 0
            }
            analytics_data = {**default_analytics, **(analytics_data or {})}
            
        except Exception as e:
            print(f"Error loading dashboard data: {str(e)}")
            # Provide default data in case of error
            opportunities = []
            investment_portfolio = []
            analytics_data = {
                "opportunities_reviewed": 0,
                "pitches_saved": 0,
                "active_investments": 0,
                "avg_match_rate": 0
            }
            user_preferences = {}
        
        return render_template("dashboard-investor.html", 
                             fullname=session["fullname"],
                             user=user,
                             opportunities=opportunities,
                             portfolio=investment_portfolio,
                             analytics=analytics_data,
                             preferences=user_preferences)

    @app.route("/api/opportunities", methods=["GET"])
    def get_opportunities():
        if "user_id" not in session or session.get("role") != "investor":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = str(session["user_id"])  # Keep as string to match your feed
        
        try:
            # Get filter parameters
            industry = request.args.get('industry')
            stage = request.args.get('stage')
            sort = request.args.get('sort', 'match_score')
            
            print(f"🔍 Fetching opportunities for user: {user_id}")
            
            # Get feed from investor_feed collection - use string user_id
            feed_doc = investor_feed.find_one({"investor_id": user_id})
            
            print(f"📋 Feed document found: {feed_doc is not None}")
            
            if not feed_doc or "matches" not in feed_doc:
                print("❌ No feed or matches found")
                return jsonify({"status": "success", "opportunities": []})
            
            print(f"🎯 Found {len(feed_doc['matches'])} matches in feed")
            
            opportunities = []
            seen_pitch_ids = set()
            
            # Process each match from the feed
            for match in feed_doc["matches"]:
                print(f"📝 Processing match: {match.get('title', 'Unknown')}")
                pitch_id = str(match.get("pitch_id", ""))
                if not pitch_id or pitch_id in seen_pitch_ids:
                    continue
                seen_pitch_ids.add(pitch_id)
                
                # Try to get detailed pitch information if pitch_id exists in pitches collection
                pitch = None
                if match.get("pitch_id"):
                    try:
                        # Try both string and ObjectId lookup since your pitch_id is "1"
                        pitch = pitches.find_one({"_id": ObjectId(pitch_id)})
                        if not pitch:
                            # Try with string ID
                            pitch = pitches.find_one({"_id": pitch_id})
                    except Exception as e:
                        print(f"⚠️ Could not find pitch {match['pitch_id']}: {e}")
                        pitch = None
                
                if not pitch:
                    print(f"Skipping stale feed match with missing pitch: {pitch_id}")
                    continue

                # Create opportunity object - use feed data directly since pitches might not exist
                opportunity = {
                    "_id": pitch_id,
                    "title": match.get("title", "Untitled Pitch"),
                    "industry": match.get("industry", "General"),  # Use match data
                    "stage": match.get("stage", "Early Stage"),    # Use match data
                    "funding_amount": match.get("funding_amount", "Not specified"),
                    "elevator_pitch": match.get("summary", "No description available."),
                    "description": match.get("description", match.get("summary", "")),
                    "match_score": match.get("match_score", 50),
                    "metrics": {
                        "mrr": match.get("mrr", "$0"),
                        "users": match.get("users", "0"),
                        "employees": match.get("employees", "0")
                    },
                    "created_at": match.get("created_at", datetime.datetime.utcnow()),
                    "entrepreneur_id": match.get("entrepreneur_id", "")
                }
                
                # If we found pitch details, enhance the opportunity
                if pitch:
                    opportunity.update({
                        "title": pitch.get("title", opportunity["title"]),
                        "industry": pitch.get("industry", opportunity["industry"]),
                        "stage": pitch.get("stage", opportunity["stage"]),
                        "funding_amount": pitch.get("funding_amount", opportunity["funding_amount"]),
                        "description": pitch.get("description", opportunity["description"]),
                        "elevator_pitch": pitch.get("elevator_pitch", opportunity["elevator_pitch"]),
                        "metrics": {
                            "mrr": pitch.get("monthly_revenue", pitch.get("mrr", opportunity["metrics"]["mrr"])),
                            "users": pitch.get("users", opportunity["metrics"]["users"]),
                            "employees": pitch.get("employees", opportunity["metrics"]["employees"])
                        }
                    })
                
                # Apply filters
                if industry and opportunity.get("industry") != industry:
                    continue
                if stage and opportunity.get("stage") != stage:
                    continue
                    
                opportunities.append(opportunity)
                print(f"✅ Added opportunity: {opportunity['title']}")
            
            # Sort opportunities
            if sort == 'recent':
                opportunities.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            elif sort == 'funding':
                opportunities.sort(key=lambda x: float(str(x.get('funding_amount', '0')).replace('$', '').replace('K', '000').replace('M', '000000')), reverse=True)
            else:  # match_score (default)
                opportunities.sort(key=lambda x: x.get('match_score', 0), reverse=True)
            
            print(f"🎉 Returning {len(opportunities)} opportunities")
            return jsonify({"status": "success", "opportunities": opportunities})
            
        except Exception as e:
            print(f"❌ Error getting opportunities from feed: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({"status": "error", "msg": f"Error getting opportunities: {str(e)}"}), 500

    @app.route("/api/feed/refresh", methods=["POST"])
    def refresh_investor_feed():
        if "user_id" not in session or session.get("role") != "investor":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = str(session["user_id"])
        
        try:
            from utils.investor_feed import create_feed_generation_workflow
            workflow = create_feed_generation_workflow()
            initial_state = {
                "feed": {"investor_id": user_id},
                "retrieved_info": "",
                "investor_needs": {},
                "final_inv_feed": {}
            }
            result = workflow.invoke(initial_state)
            feed = result.get("final_inv_feed", {})

            return jsonify({
                "status": "success", 
                "msg": f"Feed refreshed with {len(feed.get('matches', []))} matches.",
                "feed": feed
            })
            
        except Exception as e:
            return jsonify({"status": "error", "msg": f"Error refreshing feed: {str(e)}"}), 500
        
    # @app.route("/api/opportunities/<opportunity_id>/decision", methods=["POST"])
    # def make_opportunity_decision(opportunity_id):
    #     if "user_id" not in session or session.get("role") != "investor":
    #         return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
    #     user_id = ObjectId(session["user_id"])
        
    #     try:
    #         data = request.get_json()
    #         decision = data.get("decision")
            
    #         matches.update_one(
    #             {
    #                 "investor_id": user_id,
    #                 "pitch_id": ObjectId(opportunity_id)
    #             },
    #             {
    #                 "$set": {
    #                     "decision": decision,
    #                     "decision_at": datetime.datetime.utcnow(),
    #                     "updated_at": datetime.datetime.utcnow()
    #                 }
    #             },
    #             upsert=True
    #         )
            
    #         if decision == "yes":
    #             pitches.update_one(
    #                 {"_id": ObjectId(opportunity_id)},
    #                 {"$set": {"status": "matched"}}
    #             )
            
    #         update_investor_analytics(user_id)
            
    #         return jsonify({"status": "success", "msg": f"Decision recorded: {decision}"})
            
    #     except Exception as e:
    #         return jsonify({"status": "error", "msg": f"Error recording decision: {str(e)}"}), 500

    @app.route("/api/analytics/investor")
    def get_investor_analytics_api():
        if "user_id" not in session or session.get("role") != "investor":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = ObjectId(session["user_id"])
        analytics_data = get_investor_analytics(user_id)
        return jsonify({"status": "success", "analytics": analytics_data})

    @app.route("/api/portfolio")
    def get_investor_portfolio():
        if "user_id" not in session or session.get("role") != "investor":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = str(session["user_id"])
        
        try:
            investment_portfolio = list(portfolio.find({"investor_id": ObjectId(user_id)}).sort("investment_date", -1))
            if not investment_portfolio:
                investment_portfolio = []
                matched_decisions = list(investor_ent_matches.find({"investor_id": user_id}).sort("timestamp", -1))
                for decision in matched_decisions:
                    pitch_id = decision.get("pitch_id")
                    pitch = None
                    try:
                        pitch = pitches.find_one({"_id": ObjectId(pitch_id)})
                    except Exception:
                        pitch = pitches.find_one({"_id": pitch_id})

                    if not pitch:
                        continue

                    investment_portfolio.append({
                        "_id": str(decision.get("_id", pitch_id)),
                        "investor_id": user_id,
                        "pitch_id": str(pitch.get("_id", pitch_id)),
                        "company_name": pitch.get("title", "Matched Pitch"),
                        "industry": pitch.get("industry", "Unknown Industry"),
                        "stage": pitch.get("stage", "Unknown Stage"),
                        "amount": pitch.get("funding_amount", "Not specified"),
                        "funding_goal": pitch.get("funding_goal", ""),
                        "monthly_revenue": pitch.get("monthly_revenue", pitch.get("mrr", "")),
                        "cac": pitch.get("cac", ""),
                        "ltv": pitch.get("ltv", ""),
                        "growth_rate": pitch.get("growth_rate", ""),
                        "burn_rate": pitch.get("burn_rate", ""),
                        "runway": pitch.get("runway", ""),
                        "users": pitch.get("users", ""),
                        "employees": pitch.get("employees", ""),
                        "pitch_status": pitch.get("status", ""),
                        "return": 0,
                        "status": "Active",
                        "investment_date": decision.get("timestamp")
                    })
        
            # Convert ObjectId to string for JSON serialization
            for investment in investment_portfolio:
                investment["_id"] = str(investment["_id"])
                investment["investor_id"] = str(investment["investor_id"])
                if "pitch_id" in investment:
                    investment["pitch_id"] = str(investment["pitch_id"])
                    pitch = None
                    try:
                        pitch = pitches.find_one({"_id": ObjectId(investment["pitch_id"])})
                    except Exception:
                        pitch = pitches.find_one({"_id": investment["pitch_id"]})

                    if pitch:
                        investment.setdefault("company_name", pitch.get("title", "Matched Pitch"))
                        investment.setdefault("industry", pitch.get("industry", "Unknown Industry"))
                        investment.setdefault("stage", pitch.get("stage", "Unknown Stage"))
                        investment.setdefault("amount", pitch.get("funding_amount", "Not specified"))
                        investment.setdefault("funding_goal", pitch.get("funding_goal", ""))
                        investment.setdefault("monthly_revenue", pitch.get("monthly_revenue", pitch.get("mrr", "")))
                        investment.setdefault("cac", pitch.get("cac", ""))
                        investment.setdefault("ltv", pitch.get("ltv", ""))
                        investment.setdefault("growth_rate", pitch.get("growth_rate", ""))
                        investment.setdefault("burn_rate", pitch.get("burn_rate", ""))
                        investment.setdefault("runway", pitch.get("runway", ""))
                        investment.setdefault("users", pitch.get("users", ""))
                        investment.setdefault("employees", pitch.get("employees", ""))
                        investment.setdefault("pitch_status", pitch.get("status", ""))

            decision_activity = []
            activity_sources = [
                ("matched", investor_ent_matches.find({"investor_id": user_id})),
                ("maybe", investor_maybe.find({"investor_id": user_id})),
                ("rejected", investor_rejections.find({"investor_id": user_id}))
            ]

            for decision_type, cursor in activity_sources:
                for item in cursor:
                    pitch_id = item.get("pitch_id")
                    pitch = None
                    try:
                        pitch = pitches.find_one({"_id": ObjectId(pitch_id)})
                    except Exception:
                        pitch = pitches.find_one({"_id": pitch_id})

                    decision_activity.append({
                        "_id": str(item.get("_id", "")),
                        "type": decision_type,
                        "decision": item.get("decision", decision_type),
                        "pitch_id": str(pitch_id),
                        "company_name": pitch.get("title", "Unknown Pitch") if pitch else "Unknown Pitch",
                        "industry": pitch.get("industry", "Unknown Industry") if pitch else "Unknown Industry",
                        "stage": pitch.get("stage", "Unknown Stage") if pitch else "Unknown Stage",
                        "amount": pitch.get("funding_amount", "") if pitch else "",
                        "timestamp": item.get("timestamp")
                    })

            decision_activity.sort(key=lambda item: item.get("timestamp") or datetime.datetime.min, reverse=True)
            
            return jsonify({
                "status": "success",
                "portfolio": investment_portfolio,
                "activity": decision_activity
            })
            
        except Exception as e:
            return jsonify({"status": "error", "msg": f"Error loading portfolio: {str(e)}"}), 500

    @app.route("/api/decisions")
    def get_investor_decisions():
        if "user_id" not in session or session.get("role") != "investor":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401

        user_id = str(session["user_id"])

        try:
            decision_sources = [
                ("matched", investor_ent_matches.find({"investor_id": user_id})),
                ("maybe", investor_maybe.find({"investor_id": user_id})),
                ("rejected", investor_rejections.find({"investor_id": user_id}))
            ]

            decisions = []
            for decision_type, cursor in decision_sources:
                for item in cursor:
                    pitch_id = item.get("pitch_id")
                    pitch = None
                    try:
                        pitch = pitches.find_one({"_id": ObjectId(pitch_id)})
                    except Exception:
                        pitch = pitches.find_one({"_id": pitch_id})

                    decisions.append({
                        "_id": str(item.get("_id")),
                        "decision": item.get("decision", decision_type),
                        "pitch_id": str(pitch_id),
                        "pitch_title": pitch.get("title", "Unknown Pitch") if pitch else "Unknown Pitch",
                        "industry": pitch.get("industry", "Unknown") if pitch else "Unknown",
                        "stage": pitch.get("stage", "Unknown") if pitch else "Unknown",
                        "timestamp": item.get("timestamp")
                    })

            decisions.sort(key=lambda item: item.get("timestamp") or datetime.datetime.min, reverse=True)

            counts = {
                "matched": sum(1 for item in decisions if item["decision"] == "matched"),
                "maybe": sum(1 for item in decisions if item["decision"] == "maybe"),
                "rejected": sum(1 for item in decisions if item["decision"] == "rejected")
            }

            return jsonify({"status": "success", "decisions": decisions, "counts": counts})

        except Exception as e:
            return jsonify({"status": "error", "msg": f"Error loading decisions: {str(e)}"}), 500

    @app.route("/api/summaries")
    def get_investor_summaries():
        if "user_id" not in session or session.get("role") != "investor":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = str(session["user_id"])
        
        try:
            # Get summaries from summaries collection for this investor
            summaries_list = list(summaries.find({
                "investor_id": user_id
            }).sort("created_at", -1).limit(20))
            
            print(f"📋 Found {len(summaries_list)} raw summaries for user {user_id}")
            
            # Process and enhance summaries
            enhanced_summaries = []
            for summary in summaries_list:
                # Convert ObjectId to string
                summary["_id"] = str(summary["_id"])
                summary["investor_id"] = str(summary["investor_id"])
                summary["pitch_id"] = str(summary["pitch_id"])
                
                # Ensure all required fields exist with fallbacks
                enhanced_summary = {
                    "_id": summary["_id"],
                    "investor_id": summary["investor_id"],
                    "entrepreneur_id": summary.get("entrepreneur_id", ""),
                    "pitch_id": summary["pitch_id"],
                    "decision": summary.get("decision", "maybe"),
                    "summary": summary.get("summary", "No summary available."),
                    "content": summary.get("content", summary.get("summary", "No content available.")),
                    "notes": summary.get("notes", ""),
                    "created_at": summary.get("created_at", datetime.datetime.utcnow()),
                    "status": summary.get("status", "pending_review")
                }
                
                # Get pitch details for title
                pitch_id = summary["pitch_id"]
                pitch_title = "Untitled Pitch"
                
                try:
                    # Try both ObjectId and string lookup
                    pitch = pitches.find_one({"_id": ObjectId(pitch_id)})
                    if not pitch:
                        pitch = pitches.find_one({"_id": pitch_id})
                    
                    if pitch:
                        pitch_title = pitch.get("title", "Untitled Pitch")
                        # Update the content with pitch description if available
                        if "content" not in enhanced_summary or enhanced_summary["content"] == "No content available.":
                            enhanced_summary["content"] = pitch.get("description", pitch.get("elevator_pitch", enhanced_summary["summary"]))
                except Exception as e:
                    print(f"⚠️ Could not fetch pitch details for {pitch_id}: {e}")
                
                enhanced_summary["pitch_title"] = pitch_title
                enhanced_summaries.append(enhanced_summary)
                
                print(f"📝 Enhanced summary: {pitch_title} - {enhanced_summary['decision']}")
            
            print(f"✅ Returning {len(enhanced_summaries)} enhanced summaries")
            return jsonify({"status": "success", "summaries": enhanced_summaries})
            
        except Exception as e:
            print(f"❌ Error loading summaries: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"status": "error", "msg": f"Error loading summaries: {str(e)}"}), 500
        

    @app.route('/api/feed', methods=['GET'])
    def get_feed():
        investor_id = session.get('user_id')  # or however you store it
        if not investor_id:
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401

        feed_doc = investor_feed.find_one({"investor_id": investor_id})
        if not feed_doc:
            return jsonify({"status": "success", "opportunities": []})

        return jsonify({
            "status": "success",
            "opportunities": feed_doc.get("feed", [])
        })

    @app.route("/api/feed/generate", methods=["GET", "POST"])  # Add GET method
    def generate_feed():
        if "user_id" not in session:
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = str(session["user_id"])
        
        try:
            from utils.investor_feed import create_feed_generation_workflow
            workflow = create_feed_generation_workflow()
            initial_state = {
                "feed": {"investor_id": user_id},
                "retrieved_info": "",
                "investor_needs": {},
                "final_inv_feed": {}
            }
            
            result = workflow.invoke(initial_state)
            
            # Return the actual feed data, not just a message
            return jsonify({
                "status": "success", 
                "feed": result['final_inv_feed']
            })
            
        except Exception as e:
            print(f"Error generating feed: {e}")
            return jsonify({"status": "error", "msg": f"Error generating feed: {str(e)}"}), 500
        

    @app.route("/api/feed/refresh", methods=["POST"])
    def refresh_feed():
        """Refresh feed and return new opportunities"""
        if "user_id" not in session:
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = str(session["user_id"])
        
        try:
            from utils.investor_feed import create_feed_generation_workflow
            workflow = create_feed_generation_workflow()
            initial_state = {
                "feed": {"investor_id": user_id},
                "retrieved_info": "",
                "investor_needs": {},
                "final_inv_feed": {}
            }
            
            result = workflow.invoke(initial_state)
            
            return jsonify({
                "status": "success", 
                "msg": f"Feed refreshed with {len(result['final_inv_feed'].get('matches', []))} new matches",
                "feed": result['final_inv_feed']
            })
            
        except Exception as e:
            print(f"Error refreshing feed: {e}")
            return jsonify({"status": "error", "msg": f"Error refreshing feed: {str(e)}"}), 500
        

       
    @app.route("/api/investor/decision", methods=["POST"])
    def handle_investor_decision():
        """Handle investor decision (matched, maybe, rejected)"""
        try:
            # Check authentication
            if "user_id" not in session:
                print("❌ Unauthorized access attempt")
                return jsonify({
                    "status": "error", 
                    "msg": "Unauthorized"
                }), 401

            # Get request data
            data = request.get_json()
            if not data:
                print("❌ No JSON data received")
                return jsonify({
                    "status": "error",
                    "msg": "No data provided"
                }), 400

            # Extract required fields
            investor_id = str(session["user_id"])
            entrepreneur_id = data.get("entrepreneur_id")
            pitch_id = data.get("pitch_id")
            decision = data.get("decision")

            print(f"\n{'='*60}")
            print(f"📥 RECEIVED DECISION REQUEST")
            print(f"{'='*60}")
            print(f"Decision: {decision}")
            print(f"Investor ID: {investor_id}")
            print(f"Entrepreneur ID: {entrepreneur_id}")
            print(f"Pitch ID: {pitch_id}")
            print(f"{'='*60}\n")

            # Validate required fields
            if not entrepreneur_id:
                return jsonify({
                    "status": "error",
                    "msg": "entrepreneur_id is required"
                }), 400
            
            if not pitch_id:
                return jsonify({
                    "status": "error",
                    "msg": "pitch_id is required"
                }), 400
            
            if not decision:
                return jsonify({
                    "status": "error",
                    "msg": "decision is required"
                }), 400

            if decision not in ["matched", "maybe", "rejected"]:
                return jsonify({
                    "status": "error",
                    "msg": f"Invalid decision: {decision}. Must be 'matched', 'maybe', or 'rejected'"
                }), 400

            # Process the decision using LangGraph workflow
            from utils.investor_decision_handling import process_investor_decision
            result = process_investor_decision(
                investor_id=investor_id,
                entrepreneur_id=entrepreneur_id,
                pitch_id=pitch_id,
                decision=decision
            )

            print(f"📤 Decision processing result: {result}")

            # Return appropriate response
            if result.get("status") == "success":
                decision_messages = {
                    "matched": "Successfully matched with this opportunity! 🎉",
                    "maybe": "Added to your maybe list for later review 🤔",
                    "rejected": "Removed from your feed ❌"
                }
                
                return jsonify({
                    "status": "success",
                    "msg": decision_messages.get(decision, f"Successfully {decision} this opportunity"),
                    "data": {
                        "decision": decision,
                        "entrepreneur_id": entrepreneur_id,
                        "pitch_id": pitch_id,
                        "timestamp": result.get("timestamp")
                    }
                }), 200
            else:
                error_msg = result.get("error", "Unknown error occurred")
                print(f"❌ Error in decision processing: {error_msg}")
                return jsonify({
                    "status": "error",
                    "msg": f"Error processing decision: {error_msg}"
                }), 500

        except Exception as e:
            error_trace = traceback.format_exc()
            print(f"\n{'='*60}")
            print(f"❌ ROUTE ERROR")
            print(f"{'='*60}")
            print(f"Error: {str(e)}")
            print(f"\nFull traceback:")
            print(error_trace)
            print(f"{'='*60}\n")
            
            return jsonify({
                "status": "error",
                "msg": f"Server error: {str(e)}"
            }), 500

    # Utility functions to get investor decisions
    def get_investor_matches(investor_id: str):
        """Get all matches for an investor"""
        return list(investor_ent_matches.find(
            {"investor_id": investor_id},  # Keep as string
            {"_id": 0, "entrepreneur_id": 1, "pitch_id": 1, "timestamp": 1}
        ))

    def get_investor_maybes(investor_id: str):
        """Get all maybes for an investor"""
        return list(investor_maybe.find(
            {"investor_id": investor_id},  # Keep as string
            {"_id": 0, "entrepreneur_id": 1, "pitch_id": 1, "timestamp": 1}
        ))

    def get_investor_rejections(investor_id: str):
        """Get all rejections for an investor"""
        return list(investor_rejections.find(
            {"investor_id": investor_id},  # Keep as string
            {"_id": 0, "entrepreneur_id": 1, "pitch_id": 1, "timestamp": 1}
        ))

    @app.route("/api/summaries/<summary_id>", methods=["DELETE"])
    def delete_summary(summary_id):
        """Delete a summary"""
        if "user_id" not in session or session.get("role") != "investor":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        try:
            result = summaries.delete_one({"_id": ObjectId(summary_id)})
            
            if result.deleted_count > 0:
                return jsonify({"status": "success", "msg": "Summary deleted"})
            else:
                return jsonify({"status": "error", "msg": "Summary not found"}), 404
                
        except Exception as e:
            return jsonify({"status": "error", "msg": f"Error deleting summary: {str(e)}"}), 500

    @app.route("/api/summaries/reconsider", methods=["POST"])
    def reconsider_pitch():
        """Move a pitch from summaries back to opportunities"""
        if "user_id" not in session or session.get("role") != "investor":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        try:
            data = request.get_json()
            pitch_id = data.get("pitch_id")
            
            if not pitch_id:
                return jsonify({"status": "error", "msg": "Pitch ID required"}), 400
            
            # Remove from summaries
            summaries.delete_many({"pitch_id": pitch_id})
            
            # Remove from feed blocker to allow it to appear again
            investor_feed_blocker.delete_many({"pitch_id": pitch_id})
            
            return jsonify({"status": "success", "msg": "Pitch moved back to opportunities"})
            
        except Exception as e:
            return jsonify({"status": "error", "msg": f"Error reconsidering pitch: {str(e)}"}), 500
        
    @app.route("/api/investor/pitches/<pitch_id>")
    def get_pitch_for_investor(pitch_id):
        """Get pitch details for investors (read-only access)"""
        if "user_id" not in session or session.get("role") != "investor":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        try:
            print(f"🔍 Investor fetching pitch details for: {pitch_id}")
            
            # Try both ObjectId and string lookup
            pitch = None
            try:
                pitch = pitches.find_one({"_id": ObjectId(pitch_id)})
                if not pitch:
                    pitch = pitches.find_one({"_id": pitch_id})
            except:
                pitch = pitches.find_one({"_id": pitch_id})
            
            if pitch:
                # Convert ObjectId to string
                pitch["_id"] = str(pitch["_id"])
                pitch["entrepreneur_id"] = str(pitch.get("entrepreneur_id", ""))
                
                def serialize_pitch_value(value):
                    if isinstance(value, ObjectId):
                        return str(value)
                    if isinstance(value, datetime.datetime):
                        return value.isoformat()
                    if isinstance(value, dict):
                        return {key: serialize_pitch_value(item) for key, item in value.items()}
                    if isinstance(value, list):
                        return [serialize_pitch_value(item) for item in value]
                    return value

                excluded_fields = {"entrepreneur_id"}
                full_pitch = {
                    key: serialize_pitch_value(value)
                    for key, value in pitch.items()
                    if key not in excluded_fields
                }

                # Return full pitch content for investor review while keeping owner identifiers private.
                pitch_data = {
                    "_id": pitch["_id"],
                    "title": pitch.get("title", "Untitled Pitch"),
                    "industry": pitch.get("industry", "Unknown Industry"),
                    "stage": pitch.get("stage", "Unknown Stage"),
                    "funding_amount": pitch.get("funding_amount", "Not specified"),
                    "funding_goal": pitch.get("funding_goal", ""),
                    "monthly_revenue": pitch.get("monthly_revenue", ""),
                    "cac": pitch.get("cac", ""),
                    "ltv": pitch.get("ltv", ""),
                    "growth_rate": pitch.get("growth_rate", ""),
                    "burn_rate": pitch.get("burn_rate", ""),
                    "runway": pitch.get("runway", ""),
                    "description": pitch.get("description", ""),
                    "elevator_pitch": pitch.get("elevator_pitch", pitch.get("description", "No description available.")),
                    "problem_statement": pitch.get("problem_statement", ""),
                    "solution": pitch.get("solution", ""),
                    "target_market": pitch.get("target_market", ""),
                    "competitive_advantage": pitch.get("competitive_advantage", ""),
                    "metrics": pitch.get("metrics", {
                        "mrr": "$0",
                        "users": "0", 
                        "employees": "0"
                    }),
                    "created_at": serialize_pitch_value(pitch.get("created_at", "")),
                    "updated_at": serialize_pitch_value(pitch.get("updated_at", "")),
                    "full_pitch": full_pitch,
                    "all_details": full_pitch
                }
                
                print(f"✅ Found pitch for investor: {pitch_data['title']}")
                return jsonify({"status": "success", "pitch": pitch_data})
            else:
                print(f"❌ Pitch not found: {pitch_id}")
                return jsonify({"status": "error", "msg": "Pitch not found"}), 404
                
        except Exception as e:
            print(f"❌ Error fetching pitch for investor: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"status": "error", "msg": f"Error fetching pitch: {str(e)}"}), 500

    # ==================== SHARED ROUTES ====================

    @app.route("/api/preferences-investor", methods=["GET", "PUT"])
    def manage_preferences():
        if "user_id" not in session:
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = ObjectId(session["user_id"])
        role = session.get("role")
        
        if request.method == "GET":
            user_preferences = preferences.find_one({"user_id": user_id})
            if user_preferences:
                user_preferences["_id"] = str(user_preferences["_id"])
                user_preferences["user_id"] = str(user_preferences["user_id"])
            return jsonify({"status": "success", "preferences": user_preferences or {}})
        
        elif request.method == "PUT":
            try:
                data = request.get_json()
                
                update_data = {
                    "updated_at": datetime.datetime.utcnow()
                }
                
                if role == "business":
                    update_data.update({
                        "categories": data.get("categories", []),
                        "budget_min": data.get("budget_min"),
                        "budget_max": data.get("budget_max"),
                        "technologies": data.get("technologies", []),
                        "project_scope": data.get("project_scope"),
                        "match_threshold": data.get("match_threshold", 80)
                    })
                elif role == "investor":
                    update_data.update({
                        "focus_areas": data.get("focus_areas", []),
                        "investment_stages": data.get("investment_stages", []),
                        "geographic_focus": data.get("geographic_focus", []),
                        "team_criteria": data.get("team_criteria"),
                        "match_threshold": data.get("match_threshold", 75)
                    })
                elif role == "entrepreneur":
                    update_data.update({
                        "target_investor_types": data.get("target_investor_types", []),
                        "preferred_industries": data.get("preferred_industries", []),
                        "funding_range": data.get("funding_range"),
                        "match_threshold": data.get("match_threshold", 70)
                    })
                
                result = preferences.update_one(
                    {"user_id": user_id},
                    {"$set": update_data},
                    upsert=True
                )
                
                return jsonify({"status": "success", "msg": "Preferences updated successfully"})
                
            except Exception as e:
                return jsonify({"status": "error", "msg": f"Error updating preferences: {str(e)}"}), 500

    @app.route("/api/share-link", methods=["GET"])
    def get_share_link():
        if "user_id" not in session:
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = ObjectId(session["user_id"])
        role = session.get("role")
        
        share_token = f"{role}_{user_id}_{datetime.datetime.utcnow().strftime('%Y%m%d')}"
        share_link = f"https://pitchaura.com/join/{share_token}"
        
        return jsonify({"status": "success", "share_link": share_link})
