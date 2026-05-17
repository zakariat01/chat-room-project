export default function UsersPanel({ users, currentUser }) {
  return (
    <div className="users-panel">
      <div className="users-panel-header">
        Online — {users.length}
      </div>

      <div className="users-list">
        {users.length === 0 && (
          <p style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            padding: '8px 10px',
            fontFamily: 'var(--font-mono)',
          }}>
            Nobody here yet
          </p>
        )}
        {users.map(name => {
          const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
          const isMe = name === currentUser
          return (
            <div key={name} className="user-row">
              <div
                style={{
                  width: 26, height: 26,
                  borderRadius: '50%',
                  background: `hsl(${hue},55%,45%)`,
                  display: 'grid', placeItems: 'center',
                  fontSize: 11, fontWeight: 700, color: 'white',
                  flexShrink: 0,
                }}
              >
                {name.slice(0, 2).toUpperCase()}
              </div>
              <span className={`online-username${isMe ? ' is-me' : ''}`}>
                {name}{isMe ? ' ★' : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
