'use client'

import { useState } from 'react'
import { TOKNote, AREAS_OF_KNOWLEDGE, WAYS_OF_KNOWING } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen } from 'lucide-react'

interface TOKNotesSectionProps {
  initialNotes: TOKNote[]
}

export function TOKNotesSection({ initialNotes }: TOKNotesSectionProps) {
  const [notes, setNotes] = useState<TOKNote[]>(initialNotes)
  const [saving, setSaving] = useState(false)

  const getNote = (type: 'aok' | 'wok', name: string) => {
    return notes.find(n => n.category_type === type && n.category_name === name)?.content || ''
  }

  const handleSaveNote = async (type: 'aok' | 'wok', name: string, content: string) => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const existingNote = notes.find(n => n.category_type === type && n.category_name === name)

    if (existingNote) {
      const { error } = await supabase
        .from('tok_notes')
        .update({ content })
        .eq('id', existingNote.id)

      if (!error) {
        setNotes(notes.map(n => 
          n.id === existingNote.id ? { ...n, content } : n
        ))
      }
    } else if (content.trim()) {
      const { data, error } = await supabase
        .from('tok_notes')
        .insert({
          user_id: user?.id,
          category_type: type,
          category_name: name,
          content,
        })
        .select()
        .single()

      if (!error && data) {
        setNotes([...notes, data])
      }
    }

    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="aok">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="aok">Areas of Knowledge</TabsTrigger>
            <TabsTrigger value="wok">Ways of Knowing</TabsTrigger>
          </TabsList>

          <TabsContent value="aok" className="space-y-4">
            {AREAS_OF_KNOWLEDGE.map(aok => (
              <div key={aok} className="space-y-2">
                <label className="text-sm font-medium">{aok}</label>
                <Textarea
                  placeholder={`Notes about ${aok}...`}
                  defaultValue={getNote('aok', aok)}
                  onBlur={(e) => handleSaveNote('aok', aok, e.target.value)}
                  rows={3}
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="wok" className="space-y-4">
            {WAYS_OF_KNOWING.map(wok => (
              <div key={wok} className="space-y-2">
                <label className="text-sm font-medium">{wok}</label>
                <Textarea
                  placeholder={`Notes about ${wok}...`}
                  defaultValue={getNote('wok', wok)}
                  onBlur={(e) => handleSaveNote('wok', wok, e.target.value)}
                  rows={3}
                />
              </div>
            ))}
          </TabsContent>
        </Tabs>
        {saving && <p className="text-xs text-muted-foreground mt-2">Saving...</p>}
      </CardContent>
    </Card>
  )
}
