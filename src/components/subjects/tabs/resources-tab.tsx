'use client'

import { useState } from 'react'
import { Subject, StudyResource, RESOURCE_TYPES } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Pencil, 
  Trash2,
  ExternalLink,
  Video,
  FileText,
  Globe,
  Book,
  File
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ResourcesTabProps {
  subject: Subject
  resources: StudyResource[]
  onResourcesChange: (resources: StudyResource[]) => void
}

export function ResourcesTab({ subject, resources, onResourcesChange }: ResourcesTabProps) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<StudyResource | null>(null)
  
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<StudyResource['type']>('website')
  const [notes, setNotes] = useState('')

  const router = useRouter()

  const resetForm = () => {
    setTitle('')
    setUrl('')
    setType('website')
    setNotes('')
    setEditing(null)
  }

  const handleAdd = () => {
    resetForm()
    setAdding(true)
  }

  const handleEdit = (resource: StudyResource) => {
    setEditing(resource)
    setTitle(resource.title)
    setUrl(resource.url || '')
    setType(resource.type)
    setNotes(resource.notes || '')
    setAdding(true)
  }

  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const resourceData = {
      title,
      url: url || null,
      type,
      notes: notes || null,
    }

    if (editing) {
      const { data, error } = await supabase
        .from('study_resources')
        .update(resourceData)
        .eq('id', editing.id)
        .select()
        .single()

      if (!error && data) {
        onResourcesChange(resources.map(r => r.id === editing.id ? data : r))
      }
    } else {
      const { data, error } = await supabase
        .from('study_resources')
        .insert({
          ...resourceData,
          user_id: user?.id,
          subject_id: subject.id,
        })
        .select()
        .single()

      if (!error && data) {
        onResourcesChange([data, ...resources])
      }
    }

    resetForm()
    setAdding(false)
    router.refresh()
  }

  const handleDelete = async (resource: StudyResource) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('study_resources')
      .delete()
      .eq('id', resource.id)

    if (!error) {
      onResourcesChange(resources.filter(r => r.id !== resource.id))
    }
  }

  const handleCancel = () => {
    resetForm()
    setAdding(false)
  }

  const getTypeIcon = (type: StudyResource['type']) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />
      case 'article': return <FileText className="h-4 w-4" />
      case 'pdf': return <File className="h-4 w-4" />
      case 'website': return <Globe className="h-4 w-4" />
      case 'book': return <Book className="h-4 w-4" />
      default: return <File className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: StudyResource['type']) => {
    switch (type) {
      case 'video': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      case 'article': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'pdf': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      case 'website': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'book': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  // Group resources by type
  const resourcesByType = RESOURCE_TYPES.map(t => ({
    type: t,
    items: resources.filter(r => r.type === t.value)
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      {adding ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold">{editing ? 'Edit Resource' : 'Add Resource'}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Khan Academy - Calculus"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL (optional)</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this resource..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!title}>Save</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      )}

      {/* Resources List */}
      {resources.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No resources saved yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Save helpful videos, articles, and websites here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {resourcesByType.map(group => (
            <div key={group.type.value}>
              <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                {getTypeIcon(group.type.value as StudyResource['type'])}
                {group.type.label}s ({group.items.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map(resource => (
                  <div
                    key={resource.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${getTypeColor(resource.type)}`}>
                      {getTypeIcon(resource.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{resource.title}</p>
                          {resource.notes && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {resource.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {resource.url && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => window.open(resource.url!, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(resource)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(resource)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
