from flask import render_template, redirect, request, session, url_for, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import json

def register_routes(app, deps):
    users = deps.get("users")
    preferences = deps.get("preferences")

    # ==================== AUTHENTICATION ROUTES ====================

    @app.route("/")
    def home():
        if "user_id" in session:
            role = session.get("role")
            return redirect(url_for(f"dashboard_{role}"))
        return render_template("index.html")

    @app.route("/signup", methods=["GET", "POST"])
    def signup():
        if request.method == "POST":
            try:
                if request.is_json:
                    data = request.get_json()
                else:
                    data = request.form.to_dict()
                    if 'newsletter' in data:
                        data['newsletter'] = data['newsletter'].lower() == 'true'
                    
                    array_fields = ['proposalTypes', 'needs', 'opportunityTypes']
                    for field in array_fields:
                        if field in data and isinstance(data[field], str):
                            if data[field].startswith('[') and data[field].endswith(']'):
                                try:
                                    data[field] = json.loads(data[field])
                                except:
                                    data[field] = [data[field]]
                            else:
                                data[field] = [data[field]]

                role = data.get("role")
                fullname = data.get("fullname")
                email = data.get("email", "").lower()
                password = data.get("password")

                if not all([role, fullname, email, password]):
                    return jsonify({"status": "error", "msg": "All fields are required"}), 400

                if users.find_one({"email": email}):
                    return jsonify({"status": "error", "msg": "Email already registered"}), 400

                hashed_pw = generate_password_hash(password)

                user_doc = {
                    "role": role,
                    "fullname": fullname,
                    "email": email,
                    "password": hashed_pw,
                    "newsletter": data.get("newsletter", False),
                    "description": data.get("description", ""),
                    "created_at": datetime.datetime.utcnow()
                }

                if role == "business":
                    user_doc.update({
                        "company_name": data.get("companyName"),
                        "industry": data.get("industry"),
                        "company_size": data.get("companySize"),
                        "proposal_types": data.get("proposalTypes", []),
                        "budget_range": data.get("budgetRange")
                    })
                elif role == "entrepreneur":
                    user_doc.update({
                        "venture_name": data.get("ventureName"),
                        "venture_stage": data.get("ventureStage"),
                        "funding_needed": data.get("fundingNeeded"),
                        "needs": data.get("needs", []),
                        "target_market": data.get("targetMarket")
                    })
                elif role == "investor":
                    user_doc.update({
                        "investment_focus": data.get("investmentFocus"),
                        "investment_size": data.get("investmentSize"),
                        "opportunity_types": data.get("opportunityTypes", []),
                        "geographic_focus": data.get("geographicFocus")
                    })

                result = users.insert_one(user_doc)
                session["user_id"] = str(result.inserted_id)
                session["role"] = role
                session["fullname"] = fullname

                preferences.insert_one({
                    "user_id": result.inserted_id,
                    "role": role,
                    "created_at": datetime.datetime.utcnow(),
                    "updated_at": datetime.datetime.utcnow()
                })

                return jsonify({
                    "status": "success", 
                    "msg": "Account created successfully",
                    "redirect": f"/dashboard/{role}"
                })

            except Exception as e:
                return jsonify({"status": "error", "msg": f"Server error: {str(e)}"}), 500

        return render_template("signup.html")

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if request.method == "POST":
            try:
                data = request.json if request.is_json else request.form
                email = data.get("email", "").lower()
                password = data.get("password")
                role = data.get("role")

                if not all([email, password, role]):
                    return {"status": "error", "msg": "All fields are required"}, 400

                user = users.find_one({"email": email, "role": role})
                
                if user and check_password_hash(user["password"], password):
                    session["user_id"] = str(user["_id"])
                    session["role"] = user["role"]
                    session["fullname"] = user["fullname"]

                    redirect_url = f"/dashboard/{user['role']}"
                    return {
                        "status": "success", 
                        "msg": "Login successful",
                        "redirect": redirect_url
                    }

                return {"status": "error", "msg": "Invalid email, password, or role selection"}, 401
            
            except Exception as e:
                return {"status": "error", "msg": "Server error during login"}, 500

        return render_template("login.html")

    @app.route("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login"))
