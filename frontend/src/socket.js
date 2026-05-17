/**
 * socket.js — Socket.IO client singleton with JWT auth support
 *
 * API:
 *   initSocket(token)  → creates (or reconnects) the socket with the JWT
 *   getSocket()        → returns the current socket instance (or null)
 *   disconnectSocket() → cleanly disconnects and clears the instance
 *
 * Usage in ChatRoom.jsx:
 *   import { initSocket, getSocket } from "../socket";
 *
 *   // On login / component mount:
 *   const socket = initSocket(token);
 *
 *   // Anywhere else:
 *   const socket = getSocket();
 *   socket.emit("send_message", { ... });
 *
 *   // On logout:
 *   disconnectSocket();
 */

import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

let socket = null;

/**
 * Create or reconnect the Socket.IO client with a fresh JWT.
 * If a socket already exists it is disconnected first to avoid
 * duplicate connections on re-login or token refresh.
 *
 * @param {string} token  JWT from AuthContext
 * @returns {Socket}
 */
export function initSocket(token) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },                       // verified by the server on connect
    transports: ["websocket", "polling"], // websocket first, polling fallback
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

/**
 * Return the current socket instance.
 * Will be null if initSocket() has not been called yet.
 *
 * @returns {Socket | null}
 */
export function getSocket() {
  return socket;
}

/**
 * Disconnect and clear the socket instance.
 * Call this on logout so the next login gets a fresh connection.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
