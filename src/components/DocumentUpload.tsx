import { useState, useCallback } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { blink } from '@/blink/client'
import { Document } from '@/types'
import { processPDF } from '@/utils/pdfProcessor'

interface DocumentUploadProps {
  onDocumentUploaded: (document: Document) => void
}

export function DocumentUpload({ onDocumentUploaded }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file')
      return
    }

    setIsUploading(true)
    setUploadProgress(20)

    try {
      const user = await blink.auth.me()
      
      // Upload file to storage
      const { publicUrl } = await blink.storage.upload(
        file,
        `documents/${file.name}`,
        {
          upsert: true,
          onProgress: (percent) => setUploadProgress(20 + (percent * 0.3))
        }
      )

      setUploadProgress(50)

      // Process PDF and extract text
      const processedDoc = await processPDF(file)
      setUploadProgress(80)

      // Create document record with processed data
      const document = await blink.db.documents.create({
        id: processedDoc.id,
        name: processedDoc.filename,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'ready' as const,
        userId: user.id,
        pageCount: processedDoc.pageCount,
        processingTime: processedDoc.processingTime,
        url: publicUrl
      })

      // Store text chunks for search
      const chunkPromises = processedDoc.chunks.map((chunk, index) => {
        return blink.db.textChunks.create({
          id: `chunk_${processedDoc.id}_${index}`,
          documentId: processedDoc.id,
          content: chunk,
          chunkIndex: index,
          userId: user.id
        })
      })

      await Promise.all(chunkPromises)
      setUploadProgress(100)

      // Store processed data in memory for immediate use
      const documentWithData = document as any
      documentWithData.processedData = {
        chunks: processedDoc.chunks,
        vectors: processedDoc.vectors,
        vocabulary: processedDoc.vocabulary
      }

      onDocumentUploaded(documentWithData)

    } catch (error) {
      console.error('Upload failed:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [onDocumentUploaded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  return (
    <Card className="border-2 border-dashed border-gray-300 hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Processing PDF...</p>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Drop your PDF here</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse files
                </p>
              </div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}