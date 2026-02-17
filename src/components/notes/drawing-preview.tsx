'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pencil, Trash2, Maximize2 } from 'lucide-react'
import { DrawingCanvas } from './drawing-canvas'
import Image from 'next/image'

interface DrawingPreviewProps {
  drawingData: any
  previewImage: string | null
  onUpdate: (data: any, imageDataUrl: string) => void
  onDelete: () => void
  editable?: boolean
}

export function DrawingPreview({
  drawingData,
  previewImage,
  onUpdate,
  onDelete,
  editable = true,
}: DrawingPreviewProps) {
  const [canvasOpen, setCanvasOpen] = useState(false)
  const [viewFullOpen, setViewFullOpen] = useState(false)

  const handleSave = (data: any, imageDataUrl: string) => {
    onUpdate(data, imageDataUrl)
  }

  if (!previewImage && !drawingData) {
    return null
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0 relative group">
          {previewImage ? (
            <Image
              src={previewImage}
              alt="Drawing"
              width={1200}
              height={800}
              unoptimized
              className="w-full h-auto cursor-pointer"
              onClick={() => editable ? setCanvasOpen(true) : setViewFullOpen(true)}
            />
          ) : (
            <div className="h-48 flex items-center justify-center bg-muted">
              <p className="text-muted-foreground">Drawing preview not available</p>
            </div>
          )}

          {/* Overlay actions */}
          {editable && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCanvasOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewFullOpen(true)}
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Canvas */}
      <DrawingCanvas
        open={canvasOpen}
        onOpenChange={setCanvasOpen}
        initialData={drawingData}
        onSave={handleSave}
      />

      {/* View Full Dialog */}
      {viewFullOpen && previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setViewFullOpen(false)}
        >
          <Image
            src={previewImage}
            alt="Drawing full view"
            width={1600}
            height={1000}
            unoptimized
            className="max-w-full max-h-full object-contain"
          />
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4"
            onClick={() => setViewFullOpen(false)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  )
}
