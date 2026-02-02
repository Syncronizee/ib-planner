'use client'

import { useState, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Trash2,
  Maximize2,
  Minimize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  GripHorizontal,
  WrapText,
} from 'lucide-react'

interface ImageToolbarProps {
  editor: Editor
  onDelete?: (src: string) => void
}

export function ImageToolbar({ editor, onDelete }: ImageToolbarProps) {
  const [selectedImage, setSelectedImage] = useState<{
    node: any
    pos: number
    dom: HTMLElement
  } | null>(null)
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 })
  const [customWidth, setCustomWidth] = useState('')
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  
  // Check if clicked on an image
  if (target.tagName === 'IMG' && target.closest('.tiptap')) {
    event.preventDefault()
    
    const rect = target.getBoundingClientRect()
    const editorContainer = target.closest('.border.rounded-lg.overflow-hidden') as HTMLElement
    
    if (editorContainer) {
      const containerRect = editorContainer.getBoundingClientRect()
      const toolbarWidth = 320 // Approximate toolbar width
      
      // Calculate center position above image
      let left = rect.left - containerRect.left + (rect.width / 2) - (toolbarWidth / 2)
      
      // Keep toolbar within container bounds
      if (left < 10) left = 10
      if (left + toolbarWidth > containerRect.width - 10) {
        left = containerRect.width - toolbarWidth - 10
      }
      
      setToolbarPosition({
        top: rect.top - containerRect.top + 8,
        left: left,
      })
    }

    // Find the node position
    const pos = editor.view.posAtDOM(target, 0)
    const node = editor.state.doc.nodeAt(pos)
    
    setSelectedImage({ node, pos, dom: target })
    setCustomWidth(target.style.width?.replace('px', '') || (target as HTMLImageElement).naturalWidth?.toString() || '')
    setShowToolbar(true)
  } else if (!target.closest('.image-toolbar-popover')) {
    setShowToolbar(false)
    setSelectedImage(null)
  }
}

    const editorElement = document.querySelector('.tiptap')
    editorElement?.addEventListener('click', handleClick as EventListener)

    return () => {
      editorElement?.removeEventListener('click', handleClick as EventListener)
    }
  }, [editor])

  const handleResize = (size: 'small' | 'medium' | 'large' | 'full' | 'custom', customValue?: number) => {
    if (!selectedImage) return

    let width: number | null = null
    
    switch (size) {
      case 'small':
        width = 200
        break
      case 'medium':
        width = 400
        break
      case 'large':
        width = 600
        break
      case 'full':
        width = null // Remove width constraint
        break
      case 'custom':
        width = customValue || parseInt(customWidth) || null
        break
    }

    editor
      .chain()
      .focus()
      .setNodeSelection(selectedImage.pos)
      .updateAttributes('image', { width })
      .run()

    // Update DOM directly for immediate feedback
    if (width) {
      selectedImage.dom.style.width = `${width}px`
    } else {
      selectedImage.dom.style.width = ''
    }
  }

  const handleAlign = (align: 'left' | 'center' | 'right') => {
    if (!selectedImage) return

    editor
      .chain()
      .focus()
      .setNodeSelection(selectedImage.pos)
      .updateAttributes('image', { align })
      .run()
  }

  const handleWrap = () => {
    if (!selectedImage) return

    const currentNode = editor.state.doc.nodeAt(selectedImage.pos)
    const currentWrap = currentNode?.attrs.wrap ?? false
    const currentAlign = currentNode?.attrs.align ?? 'center'

    const updates: Record<string, any> = { wrap: !currentWrap }

    // If enabling wrap on a center-aligned image, switch to left
    if (!currentWrap && currentAlign === 'center') {
      updates.align = 'left'
    }

    editor
      .chain()
      .focus()
      .setNodeSelection(selectedImage.pos)
      .updateAttributes('image', updates)
      .run()
  }

  const handleDelete = () => {
    if (!selectedImage) return

    const src = selectedImage.dom.getAttribute('src')
    
    editor
      .chain()
      .focus()
      .setNodeSelection(selectedImage.pos)
      .deleteSelection()
      .run()

    if (src && onDelete) {
      onDelete(src)
    }

    setShowToolbar(false)
    setSelectedImage(null)
  }

  if (!showToolbar || !selectedImage) return null

  return (
  <div
    ref={toolbarRef}
    className="image-toolbar-popover absolute z-50 bg-background border rounded-lg shadow-lg p-2 flex items-center gap-1 transform"
    style={{
      top: `${toolbarPosition.top}px`,
      left: `${toolbarPosition.left}px`,
    }}
  >
      {/* Size presets */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleResize('small')}
        title="Small (200px)"
      >
        <Minimize2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleResize('medium')}
        title="Medium (400px)"
      >
        <GripHorizontal className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleResize('large')}
        title="Large (600px)"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Custom width */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" title="Custom size">
            W
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3">
          <div className="space-y-2">
            <Label>Width (px)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                placeholder="400"
              />
              <Button size="sm" onClick={() => handleResize('custom')}>
                Set
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Alignment */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleAlign('left')}
        title="Align left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleAlign('center')}
        title="Align center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleAlign('right')}
        title="Align right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Wrap text */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleWrap}
        title="Wrap text around image"
        className={selectedImage && editor.state.doc.nodeAt(selectedImage.pos)?.attrs.wrap ? 'bg-accent' : ''}
      >
        <WrapText className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Delete */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        className="text-destructive hover:text-destructive"
        title="Delete image"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}