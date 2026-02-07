'use client'

import { useState, useEffect } from 'react'
import { Subject, Note, SyllabusTopic } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { DrawingCanvas } from '@/components/notes/drawing-canvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  Link as LinkIcon,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface NotesTabProps {
  subject: Subject
  onSubjectUpdate: (subject: Subject) => void
}

export function NotesTab({ subject, onSubjectUpdate }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [topics, setTopics] = useState<SyllabusTopic[]>([])
  const [loading, setLoading] = useState(true)
  
  // Canvas state
  const [canvasOpen, setCanvasOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  
  // New note dialog state
  const [showNewNoteDialog, setShowNewNoteDialog] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteTopicId, setNewNoteTopicId] = useState<string | null>(null)
  
  // Delete confirmation
  const [deleteNote, setDeleteNote] = useState<Note | null>(null)
  
  // Preview state
  const [previewNote, setPreviewNote] = useState<Note | null>(null)

  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [subject.id])

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()

    const [{ data: notesData }, { data: topicsData }] = await Promise.all([
      supabase
        .from('notes')
        .select('*')
        .eq('subject_id', subject.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('syllabus_topics')
        .select('*')
        .eq('subject_id', subject.id)
        .order('unit_number', { ascending: true }),
    ])

    setNotes(notesData || [])
    setTopics(topicsData || [])
    setLoading(false)
  }

  const handleCreateNote = () => {
    setNewNoteTitle('')
    setNewNoteTopicId(null)
    setShowNewNoteDialog(true)
  }

  const handleStartNewNote = () => {
    if (!newNoteTitle.trim()) return
    setShowNewNoteDialog(false)
    setEditingNote(null)
    setCanvasOpen(true)
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
    setNewNoteTitle(note.title)
    setNewNoteTopicId(note.topic_id)
    setCanvasOpen(true)
  }

  const handleSaveNote = async (drawingData: any, previewImage: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (editingNote) {
      // Update existing note
      const { data, error } = await supabase
        .from('notes')
        .update({
          title: newNoteTitle,
          topic_id: newNoteTopicId,
          drawing_data: drawingData,
          has_drawing: true,
          content: { preview: previewImage },
        })
        .eq('id', editingNote.id)
        .select()
        .single()

      if (!error && data) {
        setNotes(notes.map(n => n.id === editingNote.id ? data : n))
      }
    } else {
      // Create new note
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user?.id,
          subject_id: subject.id,
          topic_id: newNoteTopicId,
          title: newNoteTitle,
          drawing_data: drawingData,
          has_drawing: true,
          content: { preview: previewImage },
        })
        .select()
        .single()

      if (!error && data) {
        setNotes([data, ...notes])
      }
    }

    setEditingNote(null)
    setNewNoteTitle('')
    setNewNoteTopicId(null)
    router.refresh()
  }

  const handleDeleteNote = async () => {
    if (!deleteNote) return
    
    const supabase = createClient()
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', deleteNote.id)

    if (!error) {
      setNotes(notes.filter(n => n.id !== deleteNote.id))
    }
    setDeleteNote(null)
  }

  const getTopicName = (topicId: string | null) => {
    if (!topicId) return null
    const topic = topics.find(t => t.id === topicId)
    return topic ? topic.topic_name : null
  }

  const getTopicUnit = (topicId: string | null) => {
    if (!topicId) return null
    const topic = topics.find(t => t.id === topicId)
    return topic?.unit_number || null
  }

  // Group notes by topic
  const notesWithoutTopic = notes.filter(n => !n.topic_id)
  const notesByTopic = topics
    .map(topic => ({
      topic,
      notes: notes.filter(n => n.topic_id === topic.id),
    }))
    .filter(group => group.notes.length > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading notes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Notes ({notes.length})</h3>
          <p className="text-sm text-muted-foreground">
            Create visual notes with diagrams and drawings
          </p>
        </div>
        <Button onClick={handleCreateNote}>
          <Plus className="h-4 w-4 mr-1" />
          New Note
        </Button>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No notes yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create notes with diagrams, drawings, and text.
          </p>
          <Button onClick={handleCreateNote} className="mt-4">
            <Plus className="h-4 w-4 mr-1" />
            Create Your First Note
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Notes linked to topics */}
          {notesByTopic.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Linked to Topics
              </h4>
              {notesByTopic.map(({ topic, notes: topicNotes }) => (
                <div key={topic.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {topic.unit_number ? `Unit ${topic.unit_number}` : 'Topic'}
                    </Badge>
                    <span className="text-sm font-medium">{topic.topic_name}</span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                    {topicNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onEdit={() => handleEditNote(note)}
                        onDelete={() => setDeleteNote(note)}
                        onPreview={() => setPreviewNote(note)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes without topics */}
          {notesWithoutTopic.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">General Notes</h4>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {notesWithoutTopic.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => handleEditNote(note)}
                    onDelete={() => setDeleteNote(note)}
                    onPreview={() => setPreviewNote(note)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Note Dialog */}
      <AlertDialog open={showNewNoteDialog} onOpenChange={setShowNewNoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Note</AlertDialogTitle>
            <AlertDialogDescription>
              Give your note a title and optionally link it to a syllabus topic.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="e.g. Organic Chemistry Mechanisms"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                Link to Topic (optional)
              </Label>
              <Select
                value={newNoteTopicId || 'none'}
                onValueChange={(v) => setNewNoteTopicId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No topic</SelectItem>
                  {topics.map(topic => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.unit_number ? `Unit ${topic.unit_number}: ` : ''}
                      {topic.topic_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStartNewNote}
              disabled={!newNoteTitle.trim()}
            >
              Open Canvas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteNote} onOpenChange={() => setDeleteNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteNote?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Modal */}
      {previewNote && previewNote.content?.preview && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setPreviewNote(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={previewNote.content.preview}
              alt={previewNote.title}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-3 rounded-lg">
              <p className="font-medium">{previewNote.title}</p>
              <p className="text-sm text-gray-300">
                {format(new Date(previewNote.updated_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewNote(null)
                handleEditNote(previewNote)
              }}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      )}

      {/* Drawing Canvas */}
      <DrawingCanvas
        open={canvasOpen}
        onOpenChange={setCanvasOpen}
        initialData={editingNote?.drawing_data}
        onSave={handleSaveNote}
        title={newNoteTitle || 'New Note'}
      />
    </div>
  )
}

// Note Card Component
function NoteCard({
  note,
  onEdit,
  onDelete,
  onPreview,
}: {
  note: Note
  onEdit: () => void
  onDelete: () => void
  onPreview: () => void
}) {
  const hasPreview = note.content?.preview

  return (
    <Card className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Preview Image */}
        <div 
          className="h-32 bg-muted relative"
          onClick={onPreview}
        >
          {hasPreview ? (
            <img
              src={note.content.preview}
              alt={note.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onPreview()
              }}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="font-medium text-sm truncate">{note.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(note.updated_at), 'MMM d, yyyy')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}