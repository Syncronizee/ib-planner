'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Save, X, Maximize2, Minimize2 } from 'lucide-react'
import dynamic from 'next/dynamic'

import '@excalidraw/excalidraw/index.css'

const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center h-full bg-white">
        <p className="text-muted-foreground">Loading canvas...</p>
      </div>
    )
  }
)

interface DrawingCanvasProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: any
  onSave: (data: any, imageDataUrl: string) => void
  title?: string
}

export function DrawingCanvas({
  open,
  onOpenChange,
  initialData,
  onSave,
  title = 'Note',
}: DrawingCanvasProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return

    const elements = excalidrawAPI.getSceneElements()
    const appState = excalidrawAPI.getAppState()
    const files = excalidrawAPI.getFiles()

    const { exportToBlob } = await import('@excalidraw/excalidraw')
    const blob = await exportToBlob({
      elements,
      appState: {
        ...appState,
        exportWithDarkMode: false,
        exportBackground: true,
      },
      files,
    })

    const reader = new FileReader()
    reader.onloadend = () => {
      const imageDataUrl = reader.result as string
      
      onSave(
        {
          elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
          },
          files,
        },
        imageDataUrl
      )
      onOpenChange(false)
    }
    reader.readAsDataURL(blob)
  }, [excalidrawAPI, onSave, onOpenChange])

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, handleClose])

  // Reset API when opening
  useEffect(() => {
    if (!open) {
      setExcalidrawAPI(null)
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[99] bg-black/50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className={`fixed z-[100] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen 
            ? 'inset-4' 
            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[85vh] max-w-6xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 shrink-0">
          <span className="font-semibold truncate max-w-md">{title}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleClose}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* Excalidraw Canvas */}
        <div className="flex-1 w-full">
          <Excalidraw
            excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
            initialData={initialData}
          />
        </div>
      </div>
    </>
  )
}
