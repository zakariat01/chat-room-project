# ChatRoom — PFE Project
### Real-time chat platform built with Flask + Socket.IO + React

---

## 📁 Project Structure

```
chatroom/
├── backend/
│   ├── app.py              # Flask application + Socket.IO events
│   ├── models.py           # SQLAlchemy database models
│   └── requirements.txt    # Python dependencies
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.css         # Global styles + design tokens
        ├── socket.js       # Socket.IO singleton client
        └── components/
            ├── LandingPage.jsx   # Username + room selection screen
            ├── ChatRoom.jsx      # Main chat layout & Socket.IO logic
            ├── Sidebar.jsx       # Room list + user card
            ├── MessageList.jsx   # Scrollable message feed
            ├── InputBar.jsx      # Text input + image attach + send
            └── UsersPanel.jsx    # Online users sidebar
```

---

## 🗄️ Database Schema (SQLite)

### `rooms`
| Column      | Type    | Description              |
|-------------|---------|--------------------------|
| id          | INTEGER | Primary key              |
| name        | TEXT    | Unique room identifier   |
| description | TEXT    | Room description         |
| icon        | TEXT    | Emoji icon               |
| created_at  | DATETIME| Creation timestamp       |

### `messages`
| Column     | Type    | Description                   |
|------------|---------|-------------------------------|
| id         | INTEGER | Primary key                   |
| username   | TEXT    | Sender username               |
| room_name  | TEXT    | FK → rooms.name               |
| content    | TEXT    | Message text                  |
| image_data | TEXT    | Base64-encoded image (opt.)   |
| timestamp  | DATETIME| UTC timestamp                 |

### `active_users`
| Column    | Type    | Description                         |
|-----------|---------|-------------------------------------|
| id        | INTEGER | Primary key                         |
| username  | TEXT    | Display name                        |
| room_name | TEXT    | Room the user is in                 |
| sid       | TEXT    | Socket.IO session ID (unique)       |
| joined_at | DATETIME| When the user joined                |

---

## 🚀 Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+ and npm
- Git (optional)

---

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
```

The Flask server starts on **http://localhost:5000**

The SQLite database (`chatroom.db`) is created automatically on first run.

---

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start the dev server
npm run dev
```

The React app starts on **http://localhost:3000**

---

### 3. Open the App

Navigate to **http://localhost:3000** in your browser.

---

## ✅ Implemented Features

### Mandatory (10 pts)
- ✅ No registration required — choose username and enter any room
- ✅ Multiple predefined chat rooms (general, technology, music, gaming, random)
- ✅ Real-time messaging with WebSockets (Flask-SocketIO + Socket.IO client)
- ✅ All messages appear for all participants without page refresh
- ✅ Messages stored in SQLite with username, content, and UTC timestamp
- ✅ Chronological display order

### Optional (Bonus)
- ✅ Image attachments — attach any image (< 2 MB) to messages
- ✅ Online users panel — live list of users currently in the room
- ✅ Real-time updates via WebSockets — no polling, no page refresh
- ✅ Unique username enforcement per room at join time
- ✅ System messages when users join/leave
- ✅ Room switching without disconnecting
- ✅ Message grouping (consecutive messages from same user)

---

## 🔌 API Reference

| Method | Endpoint                           | Description                     |
|--------|------------------------------------|---------------------------------|
| GET    | `/api/rooms`                       | List all rooms + online counts  |
| GET    | `/api/rooms/<room>/messages`       | Get last 100 messages in a room |
| GET    | `/api/rooms/<room>/users`          | Get currently online users      |
| POST   | `/api/validate-username`           | Check username availability     |

## 🔌 Socket.IO Events

### Client → Server
| Event          | Payload                              | Description              |
|----------------|--------------------------------------|--------------------------|
| `join`         | `{username, room}`                   | Join a room              |
| `leave`        | `{username, room}`                   | Leave a room             |
| `send_message` | `{username, room, content, image?}`  | Send a chat message      |

### Server → Client
| Event            | Payload                                | Description              |
|------------------|----------------------------------------|--------------------------|
| `join_success`   | `{room, username}`                     | Confirmed room join      |
| `new_message`    | Message object                         | New chat message         |
| `system_message` | `{content, timestamp}`                 | Join/leave notification  |
| `user_list`      | `{users: [username, ...]}`             | Updated online users     |
| `error`          | `{message}`                            | Error notification       |

---

## 🛠️ Tech Stack

| Layer     | Technology                       |
|-----------|----------------------------------|
| Backend   | Python 3, Flask 3                |
| Real-time | Flask-SocketIO 5, eventlet       |
| Database  | SQLite via Flask-SQLAlchemy      |
| Frontend  | React 18, Vite 5                 |
| WS Client | Socket.IO client 4               |
| Styling   | Pure CSS with design tokens      |
| Dates     | date-fns                         |
