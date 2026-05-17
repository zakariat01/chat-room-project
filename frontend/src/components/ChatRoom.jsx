/**
 * ChatRoom.jsx — Main chat layout & Socket.IO logic
 *
 * Changes from the pre-auth version:
 *   - Gets `user` from useAuth() instead of props
 *   - Calls initSocket(token) on mount to create an authenticated connection
 *   - Calls disconnectSocket() + logout() on sign-out
 *   - All socket payloads still use `username` for display (server ignores
 *     the client-supplied username and uses the one from the JWT instead,
 *     preventing spoofing)
 *   - Message deletion (WhatsApp-style) wired to the new `delete_message`
 *     socket event and `message_deleted` server broadcast
 *
 * Layout (unchanged from original):
 *   ┌─────────────┬──────────────────┬───────────────┐
 *   │  Sidebar    │   MessageList    │  UsersPanel   │
 *   │ (room list) │  (scrollable)    │ (online list) │
 *   └─────────────┴──────────────────┴───────────────┘
 *   Mobile: sidebar and users panel collapse to overlays.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth }        from "../context/AuthContext";
import { initSocket, disconnectSocket } from "../socket";
import Sidebar      from "./Sidebar";
import MessageList  from "./MessageList";
import InputBar     from "./InputBar";
import UsersPanel   from "./UsersPanel";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ChatRoom() {
  const { user, token, logout } = useAuth();

  // ── State ────────────────────────────────────────────────────────────────
  const [currentRoom,  setCurrentRoom]  = useState("general");
  const [messages,     setMessages]     = useState([]);
  const [onlineUsers,  setOnlineUsers]  = useState([]);
  const [rooms,        setRooms]        = useState([]);
  const [connected,    setConnected]    = useState(false);

  // Mobile panel visibility
  const [showSidebar,  setShowSidebar]  = useState(false);

  const socketRef = useRef(null);

  // ── Fetch rooms list ─────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/rooms`);
      const data = await r.json();
      setRooms(data);
    } catch (e) {
      console.error("Failed to fetch rooms:", e);
    }
  }, []);

  // ── Fetch message history for a room ─────────────────────────────────────
  const fetchMessages = useCallback(async (roomName) => {
    try {
      const r = await fetch(`${API}/api/rooms/${roomName}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  }, [token]);

  // ── Initialize socket on mount ────────────────────────────────────────────
  useEffect(() => {
    const socket = initSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", { room: currentRoom });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("connect_error", (err) => {
      console.error("Socket connect error:", err.message);
      // If server rejects with auth error, log out
      if (err.message === "Authentication error") logout();
    });

    socket.on("join_success", ({ room }) => {
      fetchMessages(room);
    });

    socket.on("new_message", (msg) => {
      setMessages((prev) => {
        // Avoid duplicate if the message is already in state
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("system_message", (msg) => {
      setMessages((prev) => [
        ...prev,
        { id: `sys-${Date.now()}`, system: true, content: msg.content, timestamp: msg.timestamp },
      ]);
    });

    socket.on("user_list", ({ users }) => setOnlineUsers(users));

    // ── Deletion event ──
    socket.on("message_deleted", ({ message_id, delete_type }) => {
      if (delete_type === "for_everyone") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message_id ? { ...m, deleted: true, content: null, image: null } : m
          )
        );
      } else {
        // for_me → remove from local list entirely
        setMessages((prev) => prev.filter((m) => m.id !== message_id));
      }
    });

    socket.on("error", ({ message }) => console.warn("Server error:", message));

    fetchRooms();

    return () => {
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Room switching ────────────────────────────────────────────────────────
  const switchRoom = useCallback((roomName) => {
    if (roomName === currentRoom) return;
    const socket = socketRef.current;
    if (!socket) return;
    setMessages([]);
    setOnlineUsers([]);
    setCurrentRoom(roomName);
    socket.emit("leave", { room: currentRoom });
    socket.emit("join",  { room: roomName });
    setShowSidebar(false);
  }, [currentRoom]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback((content, image) => {
    const socket = socketRef.current;
    if (!socket || !connected) return;
    socket.emit("send_message", {
      room: currentRoom,
      content,
      image: image || null,
    });
  }, [connected, currentRoom]);

  // ── Delete message ────────────────────────────────────────────────────────
  const deleteMessage = useCallback((messageId, deleteType) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("delete_message", {
      message_id:  messageId,
      delete_type: deleteType,   // "for_me" | "for_everyone"
    });
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleLogout = () => {
    disconnectSocket();
    logout();
  };

  // ── Separate system messages from regular messages for MessageList ────────
  const regularMessages = messages.filter((m) => !m.system);
  const systemMessages = messages.filter((m) => m.system);

  // ── Current room metadata ─────────────────────────────────────────────────
  const currentRoomData = rooms.find((r) => r.name === currentRoom);
  const roomIcon = currentRoomData?.icon || "💬";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`app-shell${showSidebar ? " sidebar-open" : ""}`}>

      {/* ── Sidebar ── */}
      <Sidebar
        rooms={rooms}
        activeRoom={currentRoom}
        username={user.username}
        onSwitchRoom={switchRoom}
        onLeave={handleLogout}
        onClose={() => setShowSidebar(false)}
      />

      {/* ── Main chat area ── */}
      <main className="chat-main">

        {/* Header */}
        <header className="chat-header">
          <button
            className="hamburger-btn"
            onClick={() => setShowSidebar(!showSidebar)}
            aria-label="Open rooms"
          >
            <span /><span /><span />
          </button>

          <span className="chat-header-icon">{roomIcon}</span>
          <span className="chat-header-name">{currentRoom}</span>
          <span className="header-divider" />
          <span className="chat-header-desc">
            {currentRoomData?.description || ""}
          </span>
        </header>

        {/* Messages */}
        <MessageList
          messages={regularMessages}
          systemMsgs={systemMessages}
          username={user.username}
          roomIcon={roomIcon}
          roomName={currentRoom}
          onDeleteForEveryone={(msgId) => deleteMessage(msgId, "for_everyone")}
        />

        {/* Input */}
        <InputBar onSend={sendMessage} disabled={!connected} />
      </main>

      {/* ── Users panel ── */}
      <UsersPanel
        users={onlineUsers}
        currentUser={user.username}
      />
    </div>
  );
}
