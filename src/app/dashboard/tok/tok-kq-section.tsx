'use client'

import { useEffect, useState } from 'react'
import { TOKKnowledgeQuestion, AREAS_OF_KNOWLEDGE, WAYS_OF_KNOWING } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, HelpCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TOKKnowledgeQuestionsSectionProps {
  initialQuestions: TOKKnowledgeQuestion[]
}

export function TOKKnowledgeQuestionsSection({ initialQuestions }: TOKKnowledgeQuestionsSectionProps) {
  const [questions, setQuestions] = useState<TOKKnowledgeQuestion[]>(initialQuestions)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<TOKKnowledgeQuestion | null>(null)
  const [question, setQuestion] = useState('')
  const [selectedAOK, setSelectedAOK] = useState<string[]>([])
  const [selectedWOK, setSelectedWOK] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const router = useRouter()

  useEffect(() => {
    setQuestions(initialQuestions)
  }, [initialQuestions])

  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const questionData = {
      question,
      aok: selectedAOK,
      wok: selectedWOK,
      notes,
    }

    if (editingQuestion) {
      const { data, error } = await supabase
        .from('tok_knowledge_questions')
        .update(questionData)
        .eq('id', editingQuestion.id)
        .select()
        .single()

      if (!error && data) {
        setQuestions(questions.map(q => q.id === editingQuestion.id ? data : q))
      }
    } else {
      const { data, error } = await supabase
        .from('tok_knowledge_questions')
        .insert({ ...questionData, user_id: user?.id })
        .select()
        .single()

      if (!error && data) {
        setQuestions([data, ...questions])
      }
    }

    setDialogOpen(false)
    setEditingQuestion(null)
    router.refresh()
  }

  const handleDelete = async (kq: TOKKnowledgeQuestion) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('tok_knowledge_questions')
      .delete()
      .eq('id', kq.id)

    if (!error) {
      setQuestions(questions.filter(q => q.id !== kq.id))
      router.refresh()
    }
  }

  const openDialog = (kq?: TOKKnowledgeQuestion) => {
    if (kq) {
      setEditingQuestion(kq)
      setQuestion(kq.question)
      setSelectedAOK(kq.aok || [])
      setSelectedWOK(kq.wok || [])
      setNotes(kq.notes || '')
    } else {
      setEditingQuestion(null)
      setQuestion('')
      setSelectedAOK([])
      setSelectedWOK([])
      setNotes('')
    }
    setDialogOpen(true)
  }

  const toggleAOK = (aok: string) => {
    setSelectedAOK(prev => 
      prev.includes(aok) ? prev.filter(a => a !== aok) : [...prev, aok]
    )
  }

  const toggleWOK = (wok: string) => {
    setSelectedWOK(prev => 
      prev.includes(wok) ? prev.filter(w => w !== wok) : [...prev, wok]
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Knowledge Questions
          </CardTitle>
          <Button onClick={() => openDialog()} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No knowledge questions saved yet. Start building your bank!
            </p>
          ) : (
            <div className="space-y-3">
              {questions.map(kq => (
                <div 
                  key={kq.id}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium flex-1">{kq.question}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog(kq)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(kq)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {kq.aok?.map(aok => (
                      <Badge key={aok} variant="secondary" className="text-xs">{aok}</Badge>
                    ))}
                    {kq.wok?.map(wok => (
                      <Badge key={wok} variant="outline" className="text-xs">{wok}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit' : 'Add'} Knowledge Question</DialogTitle>
            <DialogDescription className="sr-only">
              {editingQuestion ? 'Update a knowledge question.' : 'Create a new knowledge question.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                placeholder="e.g. How does emotion influence the way we perceive art?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Areas of Knowledge</Label>
              <div className="flex flex-wrap gap-2">
                {AREAS_OF_KNOWLEDGE.map(aok => (
                  <label key={aok} className="flex items-center gap-1 cursor-pointer">
                    <Checkbox
                      checked={selectedAOK.includes(aok)}
                      onCheckedChange={() => toggleAOK(aok)}
                    />
                    <span className="text-sm">{aok}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ways of Knowing</Label>
              <div className="flex flex-wrap gap-2">
                {WAYS_OF_KNOWING.map(wok => (
                  <label key={wok} className="flex items-center gap-1 cursor-pointer">
                    <Checkbox
                      checked={selectedWOK.includes(wok)}
                      onCheckedChange={() => toggleWOK(wok)}
                    />
                    <span className="text-sm">{wok}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Any thoughts or ideas about this KQ..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
