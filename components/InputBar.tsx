'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import type { Attachment } from '@/lib/types'
import { extractPdfText } from '@/lib/pdfExtract'

interface Props {
  onSend: (text: string, attachment?: Attachment) => void
  disabled: boolean
}

function PaperclipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  )
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
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '10px 14px 12px' }}>

      {/* ── File preview card ── */}
      {(attachment || loadingFile) && (
        <div style={{
          marginBottom: '10px',
          borderRadius: '10px',
          border: '1px solid var(--amber-border)',
          background: 'var(--amber-dim)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 10px',
        }}>
          {loadingFile ? (
            <>
              <div style={{ color: 'var(--amber)', flexShrink: 0 }}><SpinnerIcon /></div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Processing file…</span>
            </>
          ) : attachment?.type === 'image' ? (
            <>
              <img
                src={attachment.data}
                alt={attachment.name}
                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '6px', flexShrink: 0, border: '1px solid var(--border)' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {attachment.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Image</div>
              </div>
              <button onClick={() => setAttachment(undefined)} style={removeBtn}>
                <XIcon />
              </button>
            </>
          ) : attachment?.type === 'pdf' ? (
            <>
              <div style={{
                width: 40, height: 40, borderRadius: '8px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--amber)', flexShrink: 0,
              }}>
                <PdfIcon />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {attachment.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>PDF Document</div>
              </div>
              <button onClick={() => setAttachment(undefined)} style={removeBtn}>
                <XIcon />
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* ── Input row ── */}
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
          title="Attach image or PDF"
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: disabled || loadingFile ? 'not-allowed' : 'pointer',
            color: 'var(--text-muted)',
            fontSize: '11px',
            padding: '4px 8px',
            flexShrink: 0,
            opacity: disabled ? 0.4 : 1,
            transition: 'color 0.15s, border-color 0.15s',
            fontFamily: 'inherit',
            lineHeight: 1,
          }}
        >
          {loadingFile ? <SpinnerIcon /> : <PaperclipIcon />}
          <span>Attach</span>
        </button>

        {/* Textarea */}
        <textarea
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
          }}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder="message openclaw…"
          className="placeholder-muted"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            resize: 'none', color: 'var(--text)', fontFamily: 'inherit',
            fontSize: '13px', lineHeight: '1.5', overflowY: 'hidden',
            minHeight: '20px', maxHeight: '140px',
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            background: canSend ? 'var(--amber)' : 'transparent',
            border: `1px solid ${canSend ? 'var(--amber)' : 'var(--border)'}`,
            borderRadius: '6px',
            color: canSend ? '#fff' : 'var(--text-dim)',
            cursor: canSend ? 'pointer' : 'not-allowed',
            padding: '5px 12px',
            fontSize: '13px',
            fontFamily: 'inherit',
            fontWeight: 500,
            flexShrink: 0,
            transition: 'all 0.15s ease',
            lineHeight: 1,
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const removeBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)',
  display: 'flex',
  alignItems: 'center',
  padding: '4px',
  borderRadius: '4px',
  flexShrink: 0,
  lineHeight: 1,
}
