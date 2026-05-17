"""
app.py — Flask + Flask-SocketIO backend with JWT authentication

Authentication flow:
  1. POST /api/auth/register  → create account, return JWT
  2. POST /api/auth/login     → verify credentials, return JWT
  3. GET  /api/auth/me        → return current user info (requires JWT)
  4. POST /api/auth/logout    → client discards token (stateless JWT)

  Socket.IO connection requires JWT passed as:
      socket = io(URL, { auth: { token: "<jwt>" } })

  The server verifies the token on every `connect` event and stores the
  decoded user_id in Flask's request context for the lifetime of the session.
"""

import os
from datetime import datetime
from typing import Optional, Dict

from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    decode_token,
    jwt_required,
    get_jwt_identity,
)
from flask_cors import CORS

from models import db, User, Room, Message, DeletedMessage, ActiveUser

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"]    = "sqlite:///chatroom.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"]             = os.environ.get("JWT_SECRET_KEY", "change-me-in-production-please")
app.config["JWT_ACCESS_TOKEN_EXPIRES"]   = False   # tokens don't expire (simplicity); set timedelta in production

db.init_app(app)
bcrypt  = Bcrypt(app)
jwt     = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
CORS(app)

# Map socket sid → user_id so we can look up the user on any event
sid_to_user: Dict[str, int] = {}

# ---------------------------------------------------------------------------
# DB init + room seeding
# ---------------------------------------------------------------------------

SEED_ROOMS = [
    {"name": "general",    "description": "General discussion",   "icon": "💬"},
    {"name": "technology", "description": "Tech talk",            "icon": "💻"},
    {"name": "music",      "description": "Music lovers",         "icon": "🎵"},
    {"name": "gaming",     "description": "Gaming community",     "icon": "🎮"},
    {"name": "random",     "description": "Anything goes",        "icon": "🎲"},
]

with app.app_context():
    db.create_all()
    for r in SEED_ROOMS:
        if not Room.query.filter_by(name=r["name"]).first():
            db.session.add(Room(**r))
    # Clear stale active_users from previous server sessions
    ActiveUser.query.delete()
    db.session.commit()


# ---------------------------------------------------------------------------
# Helper — get authenticated user_id from socket auth token
# ---------------------------------------------------------------------------

def _get_user_from_auth(auth: Optional[Dict]) -> Optional[User]:
    """Decode JWT from socket auth dict and return the User, or None."""
    if not auth or "token" not in auth:
        return None
    try:
        data = decode_token(auth["token"])
        uid  = data.get("sub")
        return User.query.get(int(uid)) if uid else None
    except Exception:
        return None


# ===========================================================================
# REST — Auth endpoints
# ===========================================================================

@app.route("/api/auth/register", methods=["POST"])
def register():
    body = request.get_json() or {}
    username = (body.get("username") or "").strip()
    email    = (body.get("email")    or "").strip().lower()
    password = (body.get("password") or "").strip()

    # --- validation ---
    if not username or not email or not password:
        return jsonify({"error": "username, email and password are required"}), 400
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if "@" not in email:
        return jsonify({"error": "Invalid email address"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user    = User(username=username, email=email, password=pw_hash)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    body = request.get_json() or {}
    identifier = (body.get("username") or body.get("email") or "").strip()
    password   = (body.get("password") or "").strip()

    if not identifier or not password:
        return jsonify({"error": "Username/email and password are required"}), 400

    # allow login by username OR email
    user = (
        User.query.filter_by(username=identifier).first()
        or User.query.filter_by(email=identifier.lower()).first()
    )

    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({"error": "Invalid credentials"}), 401

    user.last_seen = datetime.utcnow()
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    uid  = int(get_jwt_identity())   # identity stored as str, convert back for DB
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user.last_seen = datetime.utcnow()
    db.session.commit()
    return jsonify({"user": user.to_dict()}), 200


# ===========================================================================
# REST — Rooms + Messages
# ===========================================================================

@app.route("/api/rooms", methods=["GET"])
def get_rooms():
    rooms = Room.query.all()
    result = []
    for room in rooms:
        online = ActiveUser.query.filter_by(room_name=room.name).count()
        result.append(room.to_dict(online_count=online))
    return jsonify(result), 200


@app.route("/api/rooms/<room_name>/messages", methods=["GET"])
@jwt_required()
def get_messages(room_name):
    uid = int(get_jwt_identity())

    # IDs soft-deleted by this user
    deleted_ids = {
        d.message_id
        for d in DeletedMessage.query.filter_by(user_id=uid).all()
    }

    msgs = (
        Message.query
        .filter_by(room_name=room_name, deleted_for_everyone=False)
        .order_by(Message.timestamp.asc())
        .limit(100)
        .all()
    )

    return jsonify([m.to_dict() for m in msgs if m.id not in deleted_ids]), 200


@app.route("/api/rooms/<room_name>/users", methods=["GET"])
def get_room_users(room_name):
    users = ActiveUser.query.filter_by(room_name=room_name).all()
    return jsonify({"users": [u.username for u in users]}), 200


@app.route("/api/validate-username", methods=["POST"])
def validate_username():
    """Legacy endpoint — with auth, usernames are globally unique in 'users' table."""
    body = request.get_json() or {}
    username = (body.get("username") or "").strip()
    taken    = User.query.filter_by(username=username).first() is not None
    return jsonify({"available": not taken}), 200


# ===========================================================================
# Socket.IO — connection lifecycle
# ===========================================================================

@socketio.on("connect")
def handle_connect(auth):
    user = _get_user_from_auth(auth)
    if not user:
        # Reject the connection — client must supply a valid JWT
        return False
    sid_to_user[request.sid] = user.id
    user.last_seen = datetime.utcnow()
    db.session.commit()


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    user_id = sid_to_user.pop(sid, None)

    active = ActiveUser.query.filter_by(sid=sid).first()
    if active:
        room_name = active.room_name
        username  = active.username
        db.session.delete(active)
        db.session.commit()

        # Notify remaining room members
        remaining = ActiveUser.query.filter_by(room_name=room_name).all()
        emit("user_list", {"users": [u.username for u in remaining]}, to=room_name)
        emit(
            "system_message",
            {"content": f"{username} left the room", "timestamp": datetime.utcnow().isoformat()},
            to=room_name,
        )


# ===========================================================================
# Socket.IO — room events
# ===========================================================================

@socketio.on("join")
def handle_join(data):
    sid     = request.sid
    user_id = sid_to_user.get(sid)
    if not user_id:
        emit("error", {"message": "Not authenticated"})
        return

    user      = User.query.get(user_id)
    room_name = data.get("room", "general")

    # Remove any existing session for this socket (room switching)
    old = ActiveUser.query.filter_by(sid=sid).first()
    if old and old.room_name != room_name:
        old_room = old.room_name
        db.session.delete(old)
        db.session.commit()
        leave_room(old_room)
        remaining = ActiveUser.query.filter_by(room_name=old_room).all()
        emit("user_list", {"users": [u.username for u in remaining]}, to=old_room)

    # Register presence
    if not ActiveUser.query.filter_by(sid=sid).first():
        # Remove any stale entry for this user in this room (e.g., from a reconnect)
        stale = ActiveUser.query.filter_by(user_id=user_id, room_name=room_name).all()
        for s in stale:
            db.session.delete(s)
        if stale:
            db.session.commit()

        db.session.add(ActiveUser(
            user_id=user_id,
            username=user.username,
            room_name=room_name,
            sid=sid,
        ))
        db.session.commit()

    join_room(room_name)

    # Confirm to the joining client
    emit("join_success", {"room": room_name, "username": user.username})

    # Broadcast updated user list
    members = ActiveUser.query.filter_by(room_name=room_name).all()
    emit("user_list", {"users": [m.username for m in members]}, to=room_name)

    # System join message
    emit(
        "system_message",
        {"content": f"{user.username} joined {room_name}", "timestamp": datetime.utcnow().isoformat()},
        to=room_name,
    )


@socketio.on("leave")
def handle_leave(data):
    sid     = request.sid
    user_id = sid_to_user.get(sid)
    if not user_id:
        return

    room_name = data.get("room", "general")
    active    = ActiveUser.query.filter_by(sid=sid, room_name=room_name).first()
    username  = active.username if active else "Someone"

    if active:
        db.session.delete(active)
        db.session.commit()

    leave_room(room_name)
    remaining = ActiveUser.query.filter_by(room_name=room_name).all()
    emit("user_list",      {"users": [u.username for u in remaining]}, to=room_name)
    emit("system_message", {"content": f"{username} left {room_name}", "timestamp": datetime.utcnow().isoformat()}, to=room_name)


# ===========================================================================
# Socket.IO — messaging
# ===========================================================================

@socketio.on("send_message")
def handle_send_message(data):
    sid     = request.sid
    user_id = sid_to_user.get(sid)
    if not user_id:
        emit("error", {"message": "Not authenticated"})
        return

    user      = User.query.get(user_id)
    room_name = data.get("room", "general")
    content   = (data.get("content") or "").strip()
    image     = data.get("image")    # base64 string or None

    if not content and not image:
        emit("error", {"message": "Message cannot be empty"})
        return

    # Enforce max image size (2 MB base64 ≈ ~2.7M chars)
    if image and len(image) > 2_800_000:
        emit("error", {"message": "Image too large (max 2 MB)"})
        return

    msg = Message(
        user_id=user_id,
        username=user.username,    # from auth, never from client payload
        room_name=room_name,
        content=content or None,
        image_data=image or None,
    )
    db.session.add(msg)
    db.session.commit()

    emit("new_message", msg.to_dict(), to=room_name)


# ===========================================================================
# Socket.IO — message deletion (WhatsApp-style)
# ===========================================================================

@socketio.on("delete_message")
def handle_delete_message(data):
    """
    data = { message_id: int, delete_type: "for_me" | "for_everyone" }

    for_me       → creates a DeletedMessage record; only the requester is notified
    for_everyone → sets deleted_for_everyone=True on the Message and broadcasts to room
    """
    sid     = request.sid
    user_id = sid_to_user.get(sid)
    if not user_id:
        emit("error", {"message": "Not authenticated"})
        return

    message_id  = data.get("message_id")
    delete_type = data.get("delete_type", "for_me")

    msg = Message.query.get(message_id)
    if not msg or msg.deleted_for_everyone:
        emit("error", {"message": "Message not found"})
        return

    if delete_type == "for_everyone":
        # Only the original sender can delete for everyone
        if msg.user_id != user_id:
            emit("error", {"message": "You can only delete your own messages for everyone"})
            return
        msg.deleted_for_everyone = True
        db.session.commit()
        emit(
            "message_deleted",
            {"message_id": message_id, "delete_type": "for_everyone"},
            to=msg.room_name,
        )

    else:  # for_me
        existing = DeletedMessage.query.filter_by(
            message_id=message_id, user_id=user_id
        ).first()
        if not existing:
            db.session.add(DeletedMessage(message_id=message_id, user_id=user_id))
            db.session.commit()
        # Only tell this socket — it's a local hide
        emit(
            "message_deleted",
            {"message_id": message_id, "delete_type": "for_me"},
        )


# ===========================================================================
# Entry point
# ===========================================================================

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
