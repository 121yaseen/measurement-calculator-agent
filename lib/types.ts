export type AttachmentType = 'image' | 'pdf'

export interface Attachment {
  type: AttachmentType
  name: string
  /** base64 data URL for images; extracted plain text for PDFs */
  data: string
  /** Absolute path on the shared volume where the agent can read the raw PDF */
  agentPath?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachment?: Attachment
}

/** Shape of one chunk from the OpenAI SSE stream */
export interface ChatChunk {
  choices: { delta: { content?: string }; finish_reason: string | null }[]
}
