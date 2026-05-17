"""
reset_db.py — Database reset & cleanup utility

Run this ONCE before enabling auth to wipe test data and prepare
a clean schema. It will:

  1. Drop all existing tables (messages, active_users, deleted_messages,
     users — but NOT rooms, which get re-seeded immediately after).
  2. Recreate every table with the new schema.
  3. Re-seed the five default chat rooms.
  4. Print a summary.

Usage:
  cd backend
  python reset_db.py
"""

from app import app, db, SEED_ROOMS
from models import User, Room, Message, DeletedMessage, ActiveUser


def reset():
    with app.app_context():
        print("⚠️  Dropping all tables...")
        db.drop_all()

        print("✅  Recreating schema...")
        db.create_all()

        print("🌱  Seeding rooms...")
        for r in SEED_ROOMS:
            db.session.add(Room(**r))
        db.session.commit()

        print("\n📊  Done! Current table row counts:")
        print(f"   users            : {User.query.count()}")
        print(f"   rooms            : {Room.query.count()}")
        print(f"   messages         : {Message.query.count()}")
        print(f"   deleted_messages : {DeletedMessage.query.count()}")
        print(f"   active_users     : {ActiveUser.query.count()}")
        print("\n🚀  Database is clean and ready for authentication.")


if __name__ == "__main__":
    confirm = input(
        "\n⚠️  This will permanently erase ALL users, messages, and chat data.\n"
        "   Type YES to continue: "
    ).strip()

    if confirm == "YES":
        reset()
    else:
        print("Aborted — nothing was changed.")
