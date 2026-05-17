export default function Sidebar({ rooms, activeRoom, username, onSwitchRoom, onLeave, onClose }) {
  const initials = username.slice(0, 2).toUpperCase()
  const hue = [...username].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  function handleRoomClick(name) {
    onSwitchRoom(name)
    // onClose is called inside switchRoom in ChatRoom, but belt-and-suspenders:
    onClose?.()
  }

  return (
    <>
      {/* Backdrop — CSS controls display via .app-shell.sidebar-open */}
      <div
        className="sidebar-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="sidebar">
        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">💬</div>
            <span>ChatRoom</span>
          </div>
        </div>

        {/* Room list */}
        <div className="sidebar-section-label">Text Channels</div>

        <div className="rooms-list">
          {rooms.map(room => (
            <div
              key={room.name}
              className={`room-item${activeRoom === room.name ? ' active' : ''}`}
              onClick={() => handleRoomClick(room.name)}
              title={room.description}
            >
              <span className="room-icon">{room.icon}</span>
              <div className="room-name-wrap">
                <div className="room-name">#{room.name}</div>
              </div>
              {room.online_count > 0 && (
                <span className="room-badge">{room.online_count}</span>
              )}
            </div>
          ))}
        </div>

        {/* Current user card */}
        <div className="sidebar-user">
          <div
            className="user-avatar"
            style={{ background: `hsl(${hue},60%,45%)` }}
          >
            {initials}
          </div>
          <div className="user-info">
            <div className="user-name">{username}</div>
            <div className="user-status">● Online</div>
          </div>
          <button
            className="leave-btn"
            onClick={onLeave}
            title="Leave chat"
          >
            ⏏
          </button>
        </div>
      </div>
    </>
  )
}
