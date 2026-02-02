'use client'

import { useState } from 'react'
import { RichTextEditor } from '@/components/notes/rich-text-editor'
import { useImageUpload } from '@/hooks/use-image-upload'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function NotesTestPage() {
  const [content, setContent] = useState<any>(null)
  const [plainText, setPlainText] = useState('')
  const { upload, deleteImage, uploading, uploadedImages } = useImageUpload()

  const handleChange = (newContent: any, newPlainText: string) => {
    setContent(newContent)
    setPlainText(newPlainText)
  }

  const handleImageDelete = async (src: string) => {
    console.log('Deleting image:', src)
    await deleteImage(src)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header email="test@example.com" />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Notes Editor Test</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Rich Text Editor
                {uploading && <Badge variant="secondary">Uploading...</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={content}
                onChange={handleChange}
                onImageUpload={upload}
                onImageDelete={handleImageDelete}
                placeholder="Start writing your notes here... Try pasting or dragging an image!"
              />
            </CardContent>
          </Card>

          {uploadedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Images ({uploadedImages.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {uploadedImages.map((img, i) => (
                    <div key={i} className="space-y-2">
                      <img 
                        src={img.url} 
                        alt={`Uploaded ${i + 1}`} 
                        className="rounded-lg border w-full h-32 object-cover"
                      />
                      <p className="text-xs text-muted-foreground truncate">{img.path}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Plain Text Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">
                {plainText || '(empty)'}
              </pre>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}