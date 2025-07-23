import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, ExternalLink, Copy, RotateCcw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessage, Document } from '@/types'
import { blink } from '@/blink/client'

interface ChatInterfaceProps {
  documents: Document[]
  messages: ChatMessage[]
  onMessageSent: (message: ChatMessage) => void
}

export function ChatInterface({ documents, messages, onMessageSent }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      userId: (await blink.auth.me()).id
    }

    onMessageSent(userMessage)
    setInput('')
    setIsLoading(true)

    try {
      // Simulate AI processing with mock response
      await new Promise(resolve => setTimeout(resolve, 2000))

      const aiResponse: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        type: 'assistant',
        content: `Based on your uploaded documents, I found relevant information about "${input.trim()}". This is a simulated response that would normally be generated using TF-IDF vectorization and cosine similarity search across your PDF knowledge base.`,
        timestamp: new Date().toISOString(),
        sources: documents.filter(doc => doc.status === 'ready').slice(0, 2).map((doc, index) => ({
          documentId: doc.id,
          documentName: doc.name,
          pageNumber: Math.floor(Math.random() * 10) + 1,
          relevanceScore: 0.85 - (index * 0.1),
          snippet: `Relevant excerpt from ${doc.name} that matches your query...`
        })),
        userId: (await blink.auth.me()).id
      }

      onMessageSent(aiResponse)
    } catch (error) {
      console.error('Failed to get AI response:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const readyDocuments = documents.filter(doc => doc.status === 'ready')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">AI Assistant</h2>
            <p className="text-sm text-muted-foreground">
              Ask questions about your uploaded documents
            </p>
          </div>
          <Badge variant="outline">
            {readyDocuments.length} docs ready
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Ready to help!
              </p>
              <p className="text-sm text-gray-500">
                {readyDocuments.length > 0
                  ? 'Ask me anything about your uploaded documents'
                  : 'Upload some PDFs first to start asking questions'}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'assistant' && (
                      <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    )}
                    {message.type === 'user' && (
                      <User className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      
                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium opacity-70">Sources:</p>
                          {message.sources.map((source, index) => (
                            <div
                              key={index}
                              className="bg-background/50 rounded p-2 text-xs"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">
                                  {source.documentName}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round(source.relevanceScore * 100)}% match
                                </Badge>
                              </div>
                              <p className="text-muted-foreground mb-1">
                                Page {source.pageNumber}
                              </p>
                              <p className="italic">"{source.snippet}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs opacity-50">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessage(message.content)}
                            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {message.type === 'assistant' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-4 bg-muted">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              readyDocuments.length > 0
                ? "Ask a question about your documents..."
                : "Upload documents first to start asking questions"
            }
            disabled={isLoading || readyDocuments.length === 0}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || readyDocuments.length === 0}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {readyDocuments.length === 0 && documents.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Waiting for documents to finish processing...
          </p>
        )}
      </div>
    </div>
  )
}