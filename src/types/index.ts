export interface Document {
  id: string
  name: string
  size: number
  uploadedAt: string
  status: 'processing' | 'ready' | 'error'
  chunks?: TextChunk[]
  userId: string
}

export interface TextChunk {
  id: string
  documentId: string
  content: string
  pageNumber: number
  chunkIndex: number
  tfidfVector?: number[]
}

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: SourceCitation[]
  userId: string
  confidence?: number
}

export interface SourceCitation {
  documentId: string
  documentName: string
  pageNumber: number
  relevanceScore: number
  snippet: string
}