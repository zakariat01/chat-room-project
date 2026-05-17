import { useState, useRef, useCallback } from 'react'

export default function InputBar({ onSend, disabled, placeholder }) {
  const [text, setText]             = useState('')
  const [imageData, setImageData]   = useState(null)  // base64
  const [imagePreview, setPreview]  = useState(null)  // same base64 for <img>
  const fileRef = useRef(null)
  const textRef = useRef(null)

  function handleSend() {
    if (!text.trim() && !imageData) return
    onSend(text, imageData)
    setText('')
    setImageData(null)
    setPreview(null)
    textRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith('image/')) {
      alert('Only image files are supported.')
      return
    }
    // Limit to 2 MB
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result
      setImageData(base64)
      setPreview(base64)
    }
    reader.readAsDataURL(file)

    // Reset file input so same file can be re-selected
    e.target.value = ''
  }, [])

  function removeImage() {
    setImageData(null)
    setPreview(null)
  }

  // Auto-resize textarea
  function handleInput(e) {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const canSend = (text.trim().length > 0 || imageData) && !disabled

  return (
    <div className="input-bar">
      {/* Image preview */}
      {imagePreview && (
        <div className="image-preview">
          <img src={imagePreview} alt="Preview" />
          <button className="image-preview-remove" onClick={removeImage} title="Remove">✕</button>
        </div>
      )}

      <div className="input-wrap">
        {/* Attach image button */}
        <button
          className="attach-btn"
          title="Attach image"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          type="button"
        >
          📎
        </button>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Message textarea */}
        <textarea
          ref={textRef}
          className="msg-input"
          rows={1}
          value={text}
          placeholder={disabled ? 'Connecting…' : placeholder}
          disabled={disabled}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          style={{ height: 24 }}
        />

        {/* Send button */}
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!canSend}
          title="Send (Enter)"
          type="button"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
