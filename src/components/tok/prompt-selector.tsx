'use client'

import { useState } from 'react'
import { 
  TOKPrompt, 
  DEFAULT_TOK_ESSAY_PROMPTS_2025, 
  DEFAULT_TOK_EXHIBITION_PROMPTS 
} from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PromptSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'essay' | 'exhibition'
  currentPrompt: string | null
  userPrompts: TOKPrompt[]
  onSelect: (prompt: string) => void
  onPromptsChange: (prompts: TOKPrompt[]) => void
}

export function PromptSelector({
  open,
  onOpenChange,
  type,
  currentPrompt,
  userPrompts,
  onSelect,
  onPromptsChange,
}: PromptSelectorProps) {
  const [newPrompt, setNewPrompt] = useState('')
  const [newYear, setNewYear] = useState('')
  const [adding, setAdding] = useState(false)
  const router = useRouter()

  const defaultPrompts = type === 'essay' 
    ? DEFAULT_TOK_ESSAY_PROMPTS_2025 
    : DEFAULT_TOK_EXHIBITION_PROMPTS

  const handleSelect = (prompt: string) => {
    onSelect(prompt)
    onOpenChange(false)
  }

  const handleAddCustom = async () => {
    if (!newPrompt.trim()) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('tok_prompts')
      .insert({
        user_id: user?.id,
        type,
        prompt: newPrompt,
        year: newYear || null,
        is_default: false,
      })
      .select()
      .single()

    if (!error && data) {
      onPromptsChange([...userPrompts, data])
      setNewPrompt('')
      setNewYear('')
      setAdding(false)
    }

    router.refresh()
  }

  const handleDeleteCustom = async (prompt: TOKPrompt) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('tok_prompts')
      .delete()
      .eq('id', prompt.id)

    if (!error) {
      onPromptsChange(userPrompts.filter(p => p.id !== prompt.id))
    }
  }

  const filteredUserPrompts = userPrompts.filter(p => p.type === type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Select {type === 'essay' ? 'Prescribed Title' : 'Exhibition Prompt'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="default">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="default">
              {type === 'essay' ? '2025 Titles' : 'IB Prompts'}
            </TabsTrigger>
            <TabsTrigger value="custom">My Prompts</TabsTrigger>
          </TabsList>

          <TabsContent value="default">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {defaultPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(prompt)}
                    className={`w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors ${
                      currentPrompt === prompt ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {currentPrompt === prompt && (
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      )}
                      <span className="text-sm">{prompt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="custom">
            <div className="space-y-4">
              {adding ? (
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Prompt</Label>
                    <Textarea
                      placeholder="Enter the prompt..."
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year (optional)</Label>
                    <Input
                      placeholder="e.g. 2024"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddCustom} size="sm">Save</Button>
                    <Button onClick={() => setAdding(false)} variant="outline" size="sm">Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setAdding(true)} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Prompt
                </Button>
              )}

              <ScrollArea className="h-[320px] pr-4">
                {filteredUserPrompts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No custom prompts yet. Add one above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredUserPrompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className={`p-3 rounded-lg border hover:bg-muted transition-colors ${
                          currentPrompt === prompt.prompt ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => handleSelect(prompt.prompt)}
                            className="text-left flex-1"
                          >
                            <div className="flex items-start gap-2">
                              {currentPrompt === prompt.prompt && (
                                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              )}
                              <div>
                                <span className="text-sm">{prompt.prompt}</span>
                                {prompt.year && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    {prompt.year}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCustom(prompt)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}