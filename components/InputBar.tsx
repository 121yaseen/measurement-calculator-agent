'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import type { Attachment } from '@/lib/types'
import { extractPdfText } from '@/lib/pdfExtract'

interface Props {
  onSend: (text: string, attachment?: Attachment) => void
  disabled: boolean
}

export function InputBar({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState<Attachment | undefined>()
  const [loadingFile, setLoadingFile] = useState(false)
  const [focused, setFocused] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoadingFile(true)
    try {
      if (file.type === 'application/pdf') {
        const data = await extractPdfText(file)
        setAttachment({ type: 'pdf', name: file.name, data })
      } else {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        setAttachment({ type: 'image', name: file.name, data })
      }
    } finally {
      setLoadingFile(false)
    }
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed && !attachment) return
    onSend(trimmed, attachment)
    setText('')
    setAttachment(undefined)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = !disabled && !loadingFile && (text.trim().length > 0 || !!attachment)

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '12px 16px' }}>
      {/* Attachment badge */}
      {attachment && (
        <div style={{
          marginBottom: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--surface-2)',
          border: '1px solid var(--amber-border)',
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '11px',
          color: 'var(--amber)',
        }}>
          <span>{attachment.type === 'pdf' ? '◫' : '⬚'}</span>
          <span style={{ color: 'var(--text-muted)' }}>{attachment.name}</span>
          <button
            onClick={() => setAttachment(undefined)}
            style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '2px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Input row */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        background: 'var(--surface-2)',
        border: `1px solid ${focused ? 'var(--amber-border)' : 'var(--border)'}`,
        borderRadius: '10px',
        padding: '8px 10px',
        transition: 'border-color 0.15s ease',
      }}>
        {/* Attach button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled || loadingFile}
          style={{
            background: 'none',
            border: 'none',
            cursor: disabled || loadingFile ? 'not-allowed' : 'pointer',
            color: loadingFile ? 'var(--amber)' : 'var(--text-muted)',
            fontSize: '14px',
            padding: '2px 4px',
            lineHeight: 1,
            flexShrink: 0,
            opacity: disabled ? 0.4 : 1,
            transition: 'color 0.15s',
          }}
          title="Attach image or PDF"
        >
          {loadingFile ? '◌' : '⊕'}
        </button>

        {/* Textarea */}
        <textarea
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            // Auto-grow
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
          }}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder="message openclaw…"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: '13px',
            lineHeight: '1.5',
            overflowY: 'hidden',
            minHeight: '20px',
            maxHeight: '140px',
          }}
          className="placeholder-muted"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            background: canSend ? 'var(--amber)' : 'var(--surface)',
            border: `1px solid ${canSend ? 'var(--amber)' : 'var(--border)'}`,
            borderRadius: '6px',
            color: canSend ? '#000' : 'var(--text-dim)',
            cursor: canSend ? 'pointer' : 'not-allowed',
            padding: '4px 10px',
            fontSize: '12px',
            fontFamily: 'inherit',
            fontWeight: 500,
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          ↑
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
