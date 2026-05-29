from flask import Flask, render_template, redirect, request, session, url_for, flash, jsonify, request, send_from_directory
from dotenv import load_dotenv
import os
import ssl
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import json
from bson import ObjectId
import random
from utils.vectorstore_utils import add_pitch_to_vectorstore
import string
import secrets
from utils.investor_feed import create_feed_generation_workflow
from utils.db_connect import investor_ent_matches, investor_feed, investor_maybe, investor_rejections, investor_feed_blocker
from utils.investor_decision_handling import process_investor_decision
import traceback

from routes.assets import register_routes as register_asset_routes
from routes.auth import register_routes as register_auth_routes
from routes.entrepreneur import register_routes as register_entrepreneur_routes
from routes.business import register_routes as register_business_routes
from routes.investor import register_routes as register_investor_routes

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY")
if not app.secret_key:
    if os.environ.get("RENDER"):
        raise RuntimeError("SECRET_KEY must be set in Render environment variables.")
    app.secret_key = "dev-secret-key"
BRAND_ASSET = "BidMind_favicon_final.svg"

MONGO_URI = os.environ.get("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI environment variable is required.")
client = MongoClient(MONGO_URI,
                     tls=True,
                     tlsCAFile=ssl.get_default_verify_paths().cafile)

db = client["SaaS"]

users = db["users"]  
pitches = db["pitches"]
investors = db["investors"]
proposals = db["proposals"]
matches = db["matches"]
analytics = db["analytics"]
portfolio = db["portfolio"]
preferences = db["preferences"]
investor_feed = db["investor_feed"]
proposal_links = db.proposal_links
business_analytics = db.business_analytics
summaries = db["summaries"]
submissions = db["submissions"]

# ==================== UTILITY FUNCTIONS ====================

def get_status_class(status):
    status_map = {
        'matched': 'status-matched',
        'under_review': 'status-review',
        'needs_revision': 'status-rejected'
    }
    return status_map.get(status, 'status-review')

def get_status_text(status):
    text_map = {
        'matched': 'Matched with investors',
        'under_review': 'Under AI Review',
        'needs_revision': 'Needs Revision'
    }
    return text_map.get(status, 'Under Review')

def get_status_icon(status):
    icons = {
        'matched': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>''',
        'under_review': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#0b5fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 16V12" stroke="#0b5fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 8H12.01" stroke="#0b5fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>''',
        'needs_revision': '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 6L18 18" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>'''
    }
    return icons.get(status, icons['under_review'])

def get_entrepreneur_analytics(user_id):
    total_pitches = pitches.count_documents({"entrepreneur_id": user_id})
    matched_pitches = pitches.count_documents({"entrepreneur_id": user_id, "status": "matched"})
    avg_match_rate = (matched_pitches / total_pitches * 100) if total_pitches > 0 else 0
    
    investor_views = analytics.find_one({"user_id": user_id, "type": "investor_views"})
    active_conversations = analytics.find_one({"user_id": user_id, "type": "active_conversations"})
    
    return {
        "total_pitches": total_pitches,
        "avg_match_rate": round(avg_match_rate),
        "investor_views": investor_views["value"] if investor_views else random.randint(5, 20),
        "active_conversations": active_conversations["value"] if active_conversations else random.randint(1, 5)
    }


def get_investor_analytics(user_id):
    try:
        # Get total opportunities reviewed
        opportunities_reviewed = matches.count_documents({"investor_id": user_id})
        
        # Get pitches saved (yes decisions)
        pitches_saved = matches.count_documents({
            "investor_id": user_id,
            "decision": "yes"
        })
        
        # Get active investments
        active_investments = portfolio.count_documents({
            "investor_id": user_id,
            "status": "active"
        })
        
        # Calculate average match rate
        match_records = list(matches.find({"investor_id": user_id}))
        if match_records:
            total_match_score = sum(record.get('match_score', 0) for record in match_records)
            avg_match_rate = round(total_match_score / len(match_records))
        else:
            avg_match_rate = 0
        
        return {
            "opportunities_reviewed": opportunities_reviewed,
            "pitches_saved": pitches_saved,
            "active_investments": active_investments,
            "avg_match_rate": avg_match_rate
        }
        
    except Exception as e:
        print(f"Error in get_investor_analytics: {str(e)}")
        # Return default values in case of error
        return {
            "opportunities_reviewed": 0,
            "pitches_saved": 0,
            "active_investments": 0,
            "avg_match_rate": 0
        }
def get_investor_matches_for_user(user_id):
    real_matches = list(investor_ent_matches.find({
        "entrepreneur_id": str(user_id),
        "decision": "matched"
    }).sort("timestamp", -1))

    investor_matches = []
    for match in real_matches:
        investor_id = match.get("investor_id")
        investor = None
        try:
            investor = users.find_one({"_id": ObjectId(investor_id)})
        except Exception:
            investor = users.find_one({"_id": investor_id})

        pitch = None
        try:
            pitch = pitches.find_one({"_id": ObjectId(match.get("pitch_id"))})
        except Exception:
            pitch = pitches.find_one({"_id": match.get("pitch_id")})

        focus_areas = (investor or {}).get("opportunity_types") or (investor or {}).get("investment_focus") or ["Matched investor"]
        if isinstance(focus_areas, str):
            focus_areas = [focus_areas]

        investor_matches.append({
            "name": (investor or {}).get("fullname", "Interested Investor"),
            "focus_areas": focus_areas,
            "description": f"Marked yes on {pitch.get('title', 'your pitch') if pitch else 'your pitch'}.",
            "match_percentage": match.get("match_score", 100),
            "pitch_title": pitch.get("title", "Pitch") if pitch else "Pitch",
            "matched_at": match.get("timestamp")
        })

    return investor_matches

def get_investment_opportunities(user_id, limit=10):
    try:
        # Get opportunities that are available for review
        opportunities = list(pitches.find({
            "status": {"$in": ["under_review", "matched"]}
        }).limit(limit))
        
        # Add match scores and convert ObjectIds to strings
        for opportunity in opportunities:
            opportunity["_id"] = str(opportunity["_id"])
            opportunity["entrepreneur_id"] = str(opportunity.get("entrepreneur_id", ""))
            
            # Calculate or set a default match score
            # For now, we'll use a simple calculation based on preferences
            opportunity["match_score"] = calculate_simple_match(user_id, opportunity)
            
        return opportunities
        
    except Exception as e:
        print(f"Error in get_investment_opportunities: {str(e)}")
        return []
def calculate_simple_match(user_id, opportunity):
    """Calculate a simple match score between investor and opportunity"""
    try:
        # Get investor preferences
        investor_prefs = preferences.find_one({"user_id": user_id}) or {}
        
        # Default match score
        base_score = 75
        
        # Simple matching logic (you can enhance this later)
        focus_areas = investor_prefs.get("focus_areas", [])
        if opportunity.get("industry") in focus_areas:
            base_score += 15
            
        investment_stages = investor_prefs.get("investment_stages", [])
        if any(stage in str(opportunity.get("stage", "")) for stage in investment_stages):
            base_score += 10
            
        # Ensure score is between 0-100
        return min(100, max(0, base_score))
        
    except Exception as e:
        print(f"Error in calculate_simple_match: {str(e)}")
        return 75  # Default score
    
def calculate_opportunity_match(investor_id, opportunity):
    base_match = random.randint(70, 95)
    return base_match

def update_entrepreneur_analytics(user_id):
    total_pitches = pitches.count_documents({"entrepreneur_id": user_id})
    analytics.update_one(
        {"user_id": user_id, "type": "total_pitches"},
        {"$set": {"value": total_pitches, "updated_at": datetime.datetime.utcnow()}},
        upsert=True
    )

def update_business_analytics(user_id):
    total_proposals = proposals.count_documents({"business_id": user_id})
    analytics.update_one(
        {"user_id": user_id, "type": "total_proposals"},
        {"$set": {"value": total_proposals, "updated_at": datetime.datetime.utcnow()}},
        upsert=True
    )

def update_investor_analytics(user_id):
    opportunities_reviewed = matches.count_documents({"investor_id": user_id})
    analytics.update_one(
        {"user_id": user_id, "type": "opportunities_reviewed"},
        {"$set": {"value": opportunities_reviewed, "updated_at": datetime.datetime.utcnow()}},
        upsert=True
    )

# Add utility functions to template context
@app.context_processor
def utility_processor():
    return {
        'get_status_class': get_status_class,
        'get_status_text': get_status_text,
        'get_status_icon': get_status_icon
    }


route_deps = {
    "BRAND_ASSET": BRAND_ASSET,
    "users": users,
    "pitches": pitches,
    "investors": investors,
    "proposals": proposals,
    "matches": matches,
    "analytics": analytics,
    "portfolio": portfolio,
    "preferences": preferences,
    "investor_feed": investor_feed,
    "proposal_links": proposal_links,
    "business_analytics": business_analytics,
    "summaries": summaries,
    "submissions": submissions,
    "investor_ent_matches": investor_ent_matches,
    "investor_maybe": investor_maybe,
    "investor_rejections": investor_rejections,
    "investor_feed_blocker": investor_feed_blocker,
    "get_status_class": get_status_class,
    "get_status_text": get_status_text,
    "get_status_icon": get_status_icon,
    "get_entrepreneur_analytics": get_entrepreneur_analytics,
    "get_investor_analytics": get_investor_analytics,
    "get_investor_matches_for_user": get_investor_matches_for_user,
    "get_investment_opportunities": get_investment_opportunities,
    "calculate_simple_match": calculate_simple_match,
    "calculate_opportunity_match": calculate_opportunity_match,
    "update_entrepreneur_analytics": update_entrepreneur_analytics,
    "update_business_analytics": update_business_analytics,
    "update_investor_analytics": update_investor_analytics,
}

register_asset_routes(app, route_deps)
register_auth_routes(app, route_deps)
register_entrepreneur_routes(app, route_deps)
register_business_routes(app, route_deps)
register_investor_routes(app, route_deps)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "").lower() in {"1", "true", "yes"}
    app.run(debug=debug, host="0.0.0.0", port=port)
