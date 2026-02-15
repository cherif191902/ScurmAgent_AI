from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta
from functools import wraps
import os
import scrum_graph
from bson import ObjectId
import pymongo
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'man7ebbech')

# MongoDB setup
MONGO_URI = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI") or "mongodb://localhost:27017"
client = pymongo.MongoClient(MONGO_URI)
env_db = os.getenv('MONGO_DB')
if env_db:
    db = client[env_db]
else:
    db = client.get_default_database() or client['scrum_db']
users_col = db.get_collection('users')
plans_col = db.get_collection('plans')

# Helper: ensure demo user exists
if users_col.count_documents({}) == 0:
    demo_id = str(ObjectId())
    users_col.insert_one({
        'id': demo_id,
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'test123',
        'created_at': datetime.utcnow().isoformat(),
    })

HAS_SCRUM_AGENT = getattr(scrum_graph, 'HAS_SCRUM_AGENT', True)


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'error': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            user_id = data.get('user_id')
            if not user_id:
                return jsonify({'error': 'Invalid token payload!'}), 401

            current_user = users_col.find_one({'id': user_id})
            if not current_user:
                return jsonify({'error': 'User not found!'}), 401

            current_user['id'] = current_user.get('id') or str(current_user.get('_id'))
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token!'}), 401

        return f(current_user, *args, **kwargs)

    return decorated


@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400

        if users_col.find_one({'email': data['email']}) is not None:
            return jsonify({"error": "Email already registered"}), 400
        if users_col.find_one({'username': data['username']}) is not None:
            return jsonify({"error": "Username already taken"}), 400

        new_id = str(ObjectId())
        user_doc = {
            'id': new_id,
            'username': data['username'],
            'email': data['email'],
            'password': data['password'],
            'created_at': datetime.utcnow().isoformat()
        }
        users_col.insert_one(user_doc)

        return jsonify({
            "success": True,
            "message": "User registered successfully",
            "user": {
                "id": new_id,
                "username": data['username'],
                "email": data['email']
            }
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        if not data or 'email' not in data or 'password' not in data:
            return jsonify({"error": "Missing email or password"}), 400

        user = users_col.find_one({'email': data['email']})
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.get('password') != data['password']:
            return jsonify({"error": "Invalid password"}), 401

        token = jwt.encode({
            'user_id': user.get('id') or str(user.get('_id')),
            'username': user.get('username'),
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'])

        return jsonify({
            "success": True,
            "message": "Login successful",
            "token": token,
            "user": {
                "id": user.get('id') or str(user.get('_id')),
                "username": user.get('username'),
                "email": user.get('email')
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    return jsonify({
        "success": True,
        "user": {
            "id": current_user.get('id'),
            "username": current_user.get('username'),
            'email': current_user.get('email')
        }
    }), 200


@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout(current_user):
    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    }), 200


@app.route('/api/scrum/analyze', methods=['POST'])
@token_required
def analyze_spec(current_user):
    try:
        data = request.get_json() or {}

        cahier = data.get('documentContent') or data.get('cahier_de_charge')
        if not cahier:
            return jsonify({"error": "Missing documentContent / cahier_de_charge"}), 400

        # Extraire le titre du projet
        titre_projet = scrum_graph.extract_project_title(cahier)
        print("Titre du projet:", titre_projet)

        # ✅ Lire les variables GitHub EN PREMIER (avant la construction du team)
        github_token = os.getenv("GITHUB_TOKEN")
        github_username = os.getenv("GITHUB_USERNAME") or ""

        team_members_raw = data.get('teamMembers') or []
        sprint_duration = data.get('sprintDuration') or data.get('sprint_length_days') or 2

        # ✅ name du membre = son username GitHub directement
        team = {
            'sprint_length_days': int(sprint_duration),
            'sprint_capacity_points': data.get('sprintCapacityPoints', 20),
            'members': [
                {
                    'name': m.get('name') or m.get('display_name') or 'Member',
                    'skills': m.get('skills') or [],
                    'github_login': m.get('name') or m.get('display_name') or github_username
                } for m in team_members_raw
            ]
        }

        if hasattr(scrum_graph, 'build_scrum_graph'):
            graph = scrum_graph.build_scrum_graph()
            result = graph.invoke({
                'cahier_de_charge': cahier,
                'team': team,
                'validation_attempts': 0,
                'max_validation_attempts': 1,
            })
        else:
            return jsonify({"error": "scrum_graph does not expose a planner function"}), 500

        # ── GitHub integration ──────────────────────────────────
        github_result = None

        if github_token and github_username:
            try:
                github_result = scrum_graph.create_github_scrum_board(
                    token=github_token,
                    username=github_username,
                    project_title=titre_projet,
                    sprint_backlogs=result.get("sprint_backlogs", []),
                    estimated_backlog=result.get("estimated_backlog", []),
                    assignments=result.get("assignments", []),
                    team_members=team.get("members", [])
                )
                print("GitHub board créé :", github_result["board_url"])
            except Exception as gh_err:
                print("Erreur GitHub (non bloquant):", gh_err)
                github_result = {"ok": False, "error": str(gh_err)}

        return jsonify({
            "success": True,
            "project_title": titre_projet,
            "plan": result,
            "github": github_result
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=int(os.environ.get('PORT', 5000)))