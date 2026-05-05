import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@/lib/types'

interface Props {
  messages: Message[]
  streaming: boolean
}

export function MessageList({ messages, streaming }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {msg.attachment?.type === 'image' && (
              <img
                src={msg.attachment.data}
                alt={msg.attachment.name}
                className="mb-2 max-h-48 rounded-lg object-contain"
              />
            )}
            {msg.attachment?.type === 'pdf' && (
              <div className="mb-2 text-xs opacity-70">📄 {msg.attachment.name}</div>
            )}
            {msg.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
        </div>
      ))}
      {streaming && (
        <div className="flex justify-start">
          <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-400">
            ●●●
          </div>
        </div>
      )}
    </div>
  )
}
