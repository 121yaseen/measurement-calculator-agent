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

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {attachment && (
        <div className="mb-2 flex items-center gap-2 rounded bg-gray-100 px-3 py-1 text-sm text-gray-700">
          <span>{attachment.type === 'pdf' ? '📄' : '🖼️'} {attachment.name}</span>
          <button
            className="ml-auto text-gray-400 hover:text-gray-600"
            onClick={() => setAttachment(undefined)}
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Message OpenClaw… (Shift+Enter for newline)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
        />
        <div className="flex flex-col gap-2">
          <button
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || loadingFile}
            title="Attach file"
          >
            {loadingFile ? '…' : '📎'}
          </button>
          <button
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSend}
            disabled={disabled || loadingFile || (!text.trim() && !attachment)}
          >
            Send
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>
    </div>
  )
}
