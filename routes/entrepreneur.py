from flask import render_template, redirect, request, session, url_for, jsonify
from bson import ObjectId
import datetime

def register_routes(app, deps):
    users = deps.get("users")
    pitches = deps.get("pitches")
    get_entrepreneur_analytics = deps.get("get_entrepreneur_analytics")
    get_investor_matches_for_user = deps.get("get_investor_matches_for_user")
    update_entrepreneur_analytics = deps.get("update_entrepreneur_analytics")

    # ==================== ENTREPRENEUR ROUTES ====================

    @app.route("/dashboard/entrepreneur")
    def dashboard_entrepreneur():
        if "user_id" not in session or session.get("role") != "entrepreneur":
            return redirect(url_for("login"))
        
        user_id = ObjectId(session["user_id"])
        user = users.find_one({"_id": user_id})
        
        # Get user pitches
        user_pitches = list(pitches.find({"entrepreneur_id": user_id}).sort("created_at", -1))
        
        # Convert ObjectId to string for template
        for pitch in user_pitches:
            pitch["_id"] = str(pitch["_id"])
        
        # Get investor matches
        investor_matches = get_investor_matches_for_user(user_id)
        
        # Get analytics
        analytics_data = get_entrepreneur_analytics(user_id)
        
        return render_template(
            "dashboard-entrepreneur.html",
            fullname=session["fullname"],
            user=user,
            pitches=user_pitches,
            investors=investor_matches,
            analytics=analytics_data
        )


    @app.route("/api/pitches", methods=["GET", "POST"])
    def manage_pitches():
        if "user_id" not in session or session.get("role") != "entrepreneur":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = ObjectId(session["user_id"])
        
        if request.method == "GET":
            user_pitches = list(pitches.find({"entrepreneur_id": user_id}).sort("created_at", -1))
            for pitch in user_pitches:
                pitch["_id"] = str(pitch["_id"])
                pitch["entrepreneur_id"] = str(pitch["entrepreneur_id"])
            return jsonify({"status": "success", "pitches": user_pitches})
        
        elif request.method == "POST":
            try:
                data = request.get_json()
                
                pitch_data = {
                    "entrepreneur_id": user_id,
                    "title": data.get("title"),
                    "category": data.get("category"),
                    "stage": data.get("stage"),
                    "elevator_pitch": data.get("elevator_pitch"),
                    "problem_statement": data.get("problem_statement"),
                    "solution": data.get("solution"),
                    "target_market": data.get("target_market"),
                    "competitive_advantage": data.get("competitive_advantage"),
                    "funding_amount": data.get("funding_amount"),
                    "funding_goal": data.get("funding_goal"),
                    "monthly_revenue": data.get("monthly_revenue"),
                    "cac": data.get("cac"),
                    "ltv": data.get("ltv"),
                    "growth_rate": data.get("growth_rate"),
                    "burn_rate": data.get("burn_rate"),
                    "runway": data.get("runway"),
                    "industry": data.get("industry"),
                    "status": "under_review",
                    "created_at": datetime.datetime.utcnow(),
                    "updated_at": datetime.datetime.utcnow()
                }
                
                result = pitches.insert_one(pitch_data)
                pitch_data["_id"] = str(result.inserted_id)
                pitch_data["entrepreneur_id"] = str(user_id)

                # ✅ Add to vectorstore (RAG embedding)
                try:
                    from utils.vectorstore_utils import add_pitch_to_vectorstore
                    add_pitch_to_vectorstore(pitch_data)
                except Exception as e:
                    print(f"⚠️ Vectorstore error: {e}")

                update_entrepreneur_analytics(user_id)
                
                return jsonify({
                    "status": "success", 
                    "msg": "Pitch submitted successfully",
                    "pitch_id": str(result.inserted_id)
                })
                
            except Exception as e:
                return jsonify({"status": "error", "msg": f"Error creating pitch: {str(e)}"}), 500


    @app.route("/api/pitches/<pitch_id>", methods=["GET", "PUT", "DELETE"])
    def manage_pitch(pitch_id):
        if "user_id" not in session or session.get("role") != "entrepreneur":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = ObjectId(session["user_id"])
        
        try:
            pitch_object_id = ObjectId(pitch_id)
        except:
            return jsonify({"status": "error", "msg": "Invalid pitch ID"}), 400
        
        if request.method == "GET":
            pitch = pitches.find_one({"_id": pitch_object_id, "entrepreneur_id": user_id})
            if pitch:
                pitch["_id"] = str(pitch["_id"])
                pitch["entrepreneur_id"] = str(pitch["entrepreneur_id"])
                return jsonify({"status": "success", "pitch": pitch})
            else:
                return jsonify({"status": "error", "msg": "Pitch not found"}), 404
        
        elif request.method == "PUT":
            try:
                data = request.get_json()
                update_data = {"updated_at": datetime.datetime.utcnow()}
                
                fields = ["title", "category", "stage", "elevator_pitch", "problem_statement", 
                        "solution", "target_market", "competitive_advantage", "funding_amount", "industry",
                        "funding_goal", "monthly_revenue", "cac", "ltv", "growth_rate", "burn_rate", "runway"]
                
                for field in fields:
                    if field in data:
                        update_data[field] = data[field]
                
                result = pitches.update_one(
                    {"_id": pitch_object_id, "entrepreneur_id": user_id},
                    {"$set": update_data}
                )
                
                if result.modified_count > 0:
                    # 🧠 Fetch updated pitch
                    updated_pitch = pitches.find_one({"_id": pitch_object_id})
                    updated_pitch["_id"] = str(updated_pitch["_id"])
                    updated_pitch["entrepreneur_id"] = str(updated_pitch["entrepreneur_id"])

                    # ✅ Re-embed in vectorstore
                    try:
                        from utils.vectorstore_utils import add_pitch_to_vectorstore
                        add_pitch_to_vectorstore(updated_pitch)
                    except Exception as e:
                        print(f"⚠️ Vectorstore update error: {e}")

                    return jsonify({"status": "success", "msg": "Pitch updated successfully"})
                else:
                    return jsonify({"status": "error", "msg": "Pitch not found or no changes made"}), 404
                    
            except Exception as e:
                return jsonify({"status": "error", "msg": f"Error updating pitch: {str(e)}"}), 500

        
        elif request.method == "DELETE":
            result = pitches.delete_one({"_id": pitch_object_id, "entrepreneur_id": user_id})
            if result.deleted_count > 0:
                update_entrepreneur_analytics(user_id)
                return jsonify({"status": "success", "msg": "Pitch deleted successfully"})
            else:
                return jsonify({"status": "error", "msg": "Pitch not found"}), 404

    @app.route("/api/analytics/entrepreneur")
    def get_entrepreneur_analytics_api():
        if "user_id" not in session or session.get("role") != "entrepreneur":
            return jsonify({"status": "error", "msg": "Unauthorized"}), 401
        
        user_id = ObjectId(session["user_id"])
        analytics_data = get_entrepreneur_analytics(user_id)
        return jsonify({"status": "success", "analytics": analytics_data})
