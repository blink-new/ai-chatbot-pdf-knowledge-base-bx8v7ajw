export interface Document {
  id: string
  name: string
  size: number
  uploaded_at: string
  status: 'processing' | 'ready' | 'error'
  chunks?: TextChunk[]
  user_id: string
  page_count?: number
  processing_time?: number
  url?: string
  processedData?: {
    chunks: string[]
    vectors: number[][]
    vocabulary: string[]
  }
}

export interface TextChunk {
  id: string
  document_id: string
  content: string
  page_number: number
  chunk_index: number
  user_id: string
  tfidfVector?: number[]
}

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: SourceCitation[]
  user_id: string
  confidence?: number
}

export interface SourceCitation {
  documentId: string
  documentName: string
  pageNumber: number
  relevanceScore: number
  snippet: string
}