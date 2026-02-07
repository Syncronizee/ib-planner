'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { Toggle } from '@/components/ui/toggle'
import { Separator } from '@/components/ui/separator'
import { ImageToolbar } from './image-toolbar'
import { DrawingCanvas } from './drawing-canvas'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Code2,
  Minus,
  Pencil,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface RichTextEditorProps {
  content: any
  onChange: (content: any, plainText: string) => void
  onImageUpload?: (file: File) => Promise<string | null>
  onImageDelete?: (src: string) => void
  onDrawingSave?: (data: any, imageDataUrl: string) => void
  drawingData?: any
  placeholder?: string
  editable?: boolean
}

export function RichTextEditor({
  content,
  onChange,
  onImageUpload,
  onImageDelete,
  onDrawingSave,
  drawingData,
  placeholder = 'Start writing your notes...',
  editable = true,
}: RichTextEditorProps) {
  const [drawingOpen, setDrawingOpen] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: false,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      const text = editor.getText()
      onChange(json, text)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith('image/') && onImageUpload) {
            event.preventDefault()
            handleImageUpload(file)
            return true
          }
        }
        return false
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/') && onImageUpload) {
              event.preventDefault()
              const file = item.getAsFile()
              if (file) {
                handleImageUpload(file)
              }
              return true
            }
          }
        }
        return false
      },
    },
  })

  useEffect(() => {
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON())
      const newContent = JSON.stringify(content)
      if (currentContent !== newContent && !editor.isFocused) {
        editor.commands.setContent(content)
      }
    }
  }, [content, editor])

  const handleImageUpload = useCallback(async (file: File) => {
    if (!onImageUpload || !editor) return

    const url = await onImageUpload(file)
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor, onImageUpload])

  const addImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        handleImageUpload(file)
      }
    }
    input.click()
  }, [handleImageUpload])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const handleDrawingSave = useCallback((data: any, imageDataUrl: string) => {
    // Insert the drawing image into the editor
    if (editor && imageDataUrl) {
      editor.chain().focus().setImage({ src: imageDataUrl }).run()
    }
    
    // Also call the parent's save handler
    if (onDrawingSave) {
      onDrawingSave(data, imageDataUrl)
    }
  }, [editor, onDrawingSave])

  if (!editor) {
    return (
      <div className="border rounded-lg p-4">
        <p className="text-muted-foreground">Loading editor...</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden relative">
      {/* Toolbar */}
      {editable && (
        <div className="border-b bg-muted/50 p-2 flex flex-wrap items-center gap-1">
          {/* Undo/Redo */}
          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Text formatting */}
          <Toggle
            size="sm"
            pressed={editor.isActive('bold')}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('italic')}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('underline')}
            onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('strike')}
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('highlight')}
            onPressedChange={() => editor.chain().focus().toggleHighlight().run()}
          >
            <Highlighter className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('code')}
            onPressedChange={() => editor.chain().focus().toggleCode().run()}
          >
            <Code className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Headings */}
          <Toggle
            size="sm"
            pressed={editor.isActive('heading', { level: 1 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('heading', { level: 2 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('heading', { level: 3 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Lists */}
          <Toggle
            size="sm"
            pressed={editor.isActive('bulletList')}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('orderedList')}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('blockquote')}
            onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('codeBlock')}
            onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code2 className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Alignment */}
          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: 'left' })}
            onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: 'center' })}
            onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: 'right' })}
            onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Insert */}
          <Toggle
            size="sm"
            pressed={editor.isActive('link')}
            onPressedChange={setLink}
          >
            <LinkIcon className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={addImage}
          >
            <ImageIcon className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => setDrawingOpen(true)}
            title="Add drawing"
          >
            <Pencil className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4" />
          </Toggle>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Image Toolbar */}
      {editor && editable && (
        <ImageToolbar editor={editor} onDelete={onImageDelete} />
      )}

      {/* Drawing Canvas */}
      <DrawingCanvas
        open={drawingOpen}
        onOpenChange={setDrawingOpen}
        initialData={drawingData}
        onSave={handleDrawingSave}
      />
    </div>
  )
}