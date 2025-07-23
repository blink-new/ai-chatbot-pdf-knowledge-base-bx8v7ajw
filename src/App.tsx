import { useState, useEffect, useCallback } from 'react'
import { DocumentUpload } from '@/components/DocumentUpload'
import { DocumentLibrary } from '@/components/DocumentLibrary'
import { ChatInterface } from '@/components/ChatInterface'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Document, ChatMessage } from '@/types'
import { blink } from '@/blink/client'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const loadDocuments = useCallback(async () => {
    if (!user) return
    try {
      const docs = await blink.db.documents.list({
        where: { userId: user.id },
        orderBy: { uploadedAt: 'desc' }
      })
      setDocuments(docs)
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }, [user])

  const loadMessages = useCallback(async () => {
    if (!user) return
    try {
      const msgs = await blink.db.chatMessages.list({
        where: { userId: user.id },
        orderBy: { timestamp: 'asc' }
      })
      setMessages(msgs)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }, [user])

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (user) {
      loadDocuments()
      loadMessages()
    }
  }, [user, loadDocuments, loadMessages])

  const handleDocumentUploaded = (document: Document) => {
    setDocuments(prev => [document, ...prev])
  }

  const handleDocumentDelete = async (documentId: string) => {
    try {
      await blink.db.documents.delete(documentId)
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  const handleMessageSent = async (message: ChatMessage) => {
    setMessages(prev => [...prev, message])
    
    try {
      await blink.db.chatMessages.create(message)
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">AI PDF Knowledge Base</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to start building your AI-powered document knowledge base
          </p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                AI PDF Knowledge Base
              </h1>
              <p className="text-sm text-muted-foreground">
                Upload PDFs and ask questions using AI-powered semantic search
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user.email}
              </span>
              <button
                onClick={() => blink.auth.logout()}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
          {/* Left Panel - Document Management */}
          <div className="lg:col-span-1 space-y-6">
            <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
            <DocumentLibrary 
              documents={documents}
              onDocumentDelete={handleDocumentDelete}
            />
          </div>

          {/* Right Panel - Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <ChatInterface
                documents={documents}
                messages={messages}
                onMessageSent={handleMessageSent}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App