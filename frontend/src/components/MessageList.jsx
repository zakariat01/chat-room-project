import { useEffect, useRef, useState, useCallback } from 'react'
import { format, isToday, isYesterday } from 'date-fns'

// ── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(name) {
  const hue = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return `hsl(${hue},55%,45%)`
}

function formatTimestamp(iso) {
  try {
    const d = new Date(iso)
    if (isToday(d))     return format(d, 'HH:mm')
    if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`
    return format(d, 'MMM d, HH:mm')
  } catch { return '' }
}

function buildTimeline(messages, systemMsgs) {
  const chat = messages.map(m => ({ ...m, _type: 'chat' }))
  const sys  = systemMsgs.map(m => ({ ...m, _type: 'system' }))
  return [...chat, ...sys].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

// ── "Delete for Me" persistence via localStorage ──────────────────────────────
const STORAGE_KEY = 'chatroom_deleted_for_me'

function getDeletedForMe() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) || []) }
  catch { return new Set() }
}

function saveDeletedForMe(set) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])) }
  catch {}
}

// ── Context Menu Component ───────────────────────────────────────────────────

function MessageMenu({ isMe, onDeleteForMe, onDeleteForEveryone, onClose, anchorRef }) {
  const menuRef = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    // Small delay so the triggering click doesn't immediately close
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 50)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClick) }
  }, [onClose, anchorRef])

  // Position: try to stay inside viewport
  const [pos, setPos] = useState({ top: 0, left: 0 })
  useEffect(() => {
    if (!anchorRef.current || !menuRef.current) return
    const anchor = anchorRef.current.getBoundingClientRect()
    const menu   = menuRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top  = anchor.bottom + 4
    let left = anchor.left

    if (left + menu.width > vw - 8)  left = vw - menu.width - 8
    if (left < 8) left = 8
    if (top + menu.height > vh - 8)  top = anchor.top - menu.height - 4

    setPos({ top, left })
  }, [anchorRef])

  return (
    <div
      ref={menuRef}
      className="msg-menu"
      style={{ top: pos.top, left: pos.left }}
      role="menu"
    >
      <button className="msg-menu-item msg-menu-item--danger" onClick={onDeleteForMe} role="menuitem">
        <span className="msg-menu-icon">🗑</span>
        Delete for Me
      </button>
      {isMe && (
        <button className="msg-menu-item msg-menu-item--danger-strong" onClick={onDeleteForEveryone} role="menuitem">
          <span className="msg-menu-icon">⚠</span>
          Delete for Everyone
        </button>
      )}
    </div>
  )
}

// ── Single Message Row ────────────────────────────────────────────────────────

function MessageRow({ item, idx, prevItem, username, onDeleteForMe, onDeleteForEveryone }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const dotsRef  = useRef(null)
  const rowRef   = useRef(null)
  const longPressTimer = useRef(null)

  const isMe      = item.username === username
  const initials  = (item.username || '?').slice(0, 2).toUpperCase()
  const color     = avatarColor(item.username)

  const isGrouped =
    prevItem &&
    prevItem._type === 'chat' &&
    prevItem.username === item.username &&
    Math.abs(new Date(item.timestamp) - new Date(prevItem.timestamp)) < 60000

  // ── Long press for mobile ──────────────────────────────────────────────────
  function startLongPress(e) {
    longPressTimer.current = setTimeout(() => {
      e.preventDefault()
      setMenuOpen(true)
    }, 500)
  }
  function cancelLongPress() {
    clearTimeout(longPressTimer.current)
  }

  // ── Deleted-for-everyone indicator ────────────────────────────────────────
  if (item.deleted_for_everyone) {
    return (
      <div
        ref={rowRef}
        className="message-row message-row--deleted"
        style={{ marginTop: isGrouped ? 0 : 8 }}
      >
        {!isGrouped ? (
          <div className="msg-avatar" style={{ background: color }} title={item.username}>
            {initials}
          </div>
        ) : (
          <div style={{ width: 36, flexShrink: 0 }} />
        )}
        <div className="msg-body">
          {!isGrouped && (
            <div className="msg-meta">
              <span className="msg-username" style={{ color: isMe ? 'var(--accent-text)' : color }}>
                {item.username}
              </span>
              <span className="msg-time">{formatTimestamp(item.timestamp)}</span>
            </div>
          )}
          <p className="msg-content msg-content--deleted">
            🚫 This message was deleted.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rowRef}
      className="message-row"
      style={{ marginTop: isGrouped ? 0 : 8 }}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
    >
      {/* Avatar */}
      {!isGrouped ? (
        <div className="msg-avatar" style={{ background: color }} title={item.username}>
          {initials}
        </div>
      ) : (
        <div style={{ width: 36, flexShrink: 0 }} />
      )}

      <div className="msg-body">
        {/* Meta */}
        {!isGrouped && (
          <div className="msg-meta">
            <span className="msg-username" style={{ color: isMe ? 'var(--accent-text)' : color }}>
              {item.username}
              {isMe && (
                <span style={{ fontSize: 10, marginLeft: 5, color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'var(--font-mono)' }}>
                  (you)
                </span>
              )}
            </span>
            <span className="msg-time">{formatTimestamp(item.timestamp)}</span>
          </div>
        )}

        {item.content && <p className="msg-content">{item.content}</p>}

        {item.image && (
          <img
            className="msg-image"
            src={item.image}
            alt="attachment"
            onClick={() => window.open(item.image, '_blank')}
          />
        )}
      </div>

      {/* Three-dots button — visible on hover (desktop) or always on mobile */}
      <div className="msg-actions">
        <button
          ref={dotsRef}
          className={`msg-dots-btn${menuOpen ? ' is-active' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Message options"
          title="Message options"
          type="button"
        >
          ⋯
        </button>
      </div>

      {/* Context menu — portalled to fixed position */}
      {menuOpen && (
        <MessageMenu
          isMe={isMe}
          anchorRef={dotsRef}
          onClose={() => setMenuOpen(false)}
          onDeleteForMe={() => { setMenuOpen(false); onDeleteForMe(item.id) }}
          onDeleteForEveryone={() => { setMenuOpen(false); onDeleteForEveryone(item.id) }}
        />
      )}
    </div>
  )
}

// ── Main MessageList ──────────────────────────────────────────────────────────

export default function MessageList({
  messages,
  systemMsgs,
  username,
  roomIcon,
  roomName,
  onDeleteForEveryone,
}) {
  const bottomRef = useRef(null)

  // "Delete for Me" — persisted in localStorage
  const [deletedForMe, setDeletedForMe] = useState(() => getDeletedForMe())

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, systemMsgs])

  const handleDeleteForMe = useCallback((msgId) => {
    setDeletedForMe(prev => {
      const next = new Set(prev)
      next.add(msgId)
      saveDeletedForMe(next)
      return next
    })
  }, [])

  const handleDeleteForEveryone = useCallback((msgId) => {
    onDeleteForEveryone?.(msgId)
  }, [onDeleteForEveryone])

  const timeline = buildTimeline(messages, systemMsgs)

  return (
    <div className="messages-area">
      <div className="messages-start">
        <div className="messages-start-icon">{roomIcon}</div>
        <h2>Welcome to #{roomName}</h2>
        <p>// This is the beginning of #{roomName}</p>
      </div>

      {timeline.map((item, idx) => {
        // System message
        if (item._type === 'system') {
          return (
            <div key={`sys-${item.id || idx}`} className="message-row is-system">
              <span className="system-badge">
                {item.content} · {formatTimestamp(item.timestamp)}
              </span>
            </div>
          )
        }

        // Hidden for this user (Delete for Me)
        if (deletedForMe.has(item.id)) return null

        const prevItem = timeline[idx - 1]

        return (
          <MessageRow
            key={item.id || `msg-${idx}`}
            item={item}
            idx={idx}
            prevItem={prevItem}
            username={username}
            onDeleteForMe={handleDeleteForMe}
            onDeleteForEveryone={handleDeleteForEveryone}
          />
        )
      })}

      <div ref={bottomRef} />
    </div>
  )
}
