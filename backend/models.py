"""
models.py — SQLAlchemy database models for ChatRoom

Tables:
  users           — authenticated accounts
  rooms           — predefined chat rooms
  messages        — all chat messages (linked to users)
  deleted_messages — per-user soft deletes ("Delete for Me")
  active_users    — ephemeral online-user tracking by socket session
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(db.Model):
    __tablename__ = "users"

    id         = db.Column(db.Integer, primary_key=True)
    username   = db.Column(db.Text, unique=True, nullable=False)
    email      = db.Column(db.Text, unique=True, nullable=False)
    password   = db.Column(db.Text, nullable=False)          # bcrypt hash
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen  = db.Column(db.DateTime, default=datetime.utcnow)

    # relationships
    messages       = db.relationship("Message",       backref="author",   lazy=True)
    deleted_msgs   = db.relationship("DeletedMessage", backref="user",    lazy=True)
    active_sessions= db.relationship("ActiveUser",    backref="account",  lazy=True)

    def to_dict(self):
        return {
            "id":         self.id,
            "username":   self.username,
            "email":      self.email,
            "created_at": self.created_at.isoformat(),
            "last_seen":  self.last_seen.isoformat(),
        }


# ---------------------------------------------------------------------------
# Room
# ---------------------------------------------------------------------------

class Room(db.Model):
    __tablename__ = "rooms"

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.Text, unique=True, nullable=False)
    description = db.Column(db.Text)
    icon        = db.Column(db.Text)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self, online_count=0):
        return {
            "id":          self.id,
            "name":        self.name,
            "description": self.description,
            "icon":        self.icon,
            "online":      online_count,
        }


# ---------------------------------------------------------------------------
# Message
# ---------------------------------------------------------------------------

class Message(db.Model):
    __tablename__ = "messages"

    id                   = db.Column(db.Integer, primary_key=True)
    user_id              = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    username             = db.Column(db.Text, nullable=False)   # denormalized for fast display
    room_name            = db.Column(db.Text, db.ForeignKey("rooms.name"), nullable=False)
    content              = db.Column(db.Text)
    image_data           = db.Column(db.Text)                   # base64 image (optional)
    timestamp            = db.Column(db.DateTime, default=datetime.utcnow)
    deleted_for_everyone = db.Column(db.Boolean, default=False) # "Delete for Everyone"

    def to_dict(self):
        return {
            "id":        self.id,
            "user_id":   self.user_id,
            "username":  self.username,
            "room":      self.room_name,
            "content":   self.content,
            "image":     self.image_data,
            "timestamp": self.timestamp.isoformat(),
            "deleted":   self.deleted_for_everyone,
        }


# ---------------------------------------------------------------------------
# DeletedMessage — per-user "Delete for Me" soft delete
# ---------------------------------------------------------------------------

class DeletedMessage(db.Model):
    __tablename__ = "deleted_messages"

    id         = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey("messages.id"), nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"),    nullable=False)
    deleted_at = db.Column(db.DateTime, default=datetime.utcnow)

    # A user can only soft-delete a message once
    __table_args__ = (
        db.UniqueConstraint("message_id", "user_id", name="uq_deleted_per_user"),
    )


# ---------------------------------------------------------------------------
# ActiveUser — tracks who is currently online in which room (ephemeral)
# ---------------------------------------------------------------------------

class ActiveUser(db.Model):
    __tablename__ = "active_users"

    id        = db.Column(db.Integer, primary_key=True)
    user_id   = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    username  = db.Column(db.Text, nullable=False)
    room_name = db.Column(db.Text, nullable=False)
    sid       = db.Column(db.Text, unique=True, nullable=False)   # Socket.IO session ID
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
