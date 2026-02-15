'use client'

import { useState } from 'react'
import { TimetableEntry, Subject, DAYS_OF_WEEK, SUBJECT_COLORS } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Clock, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WeeklyTimetableProps {
  entries: TimetableEntry[]
  subjects: Subject[]
  onEntriesChange: (entries: TimetableEntry[]) => void
}

export function WeeklyTimetable({ entries, subjects, onEntriesChange }: WeeklyTimetableProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TimetableEntry | null>(null)
  
  const [entryType, setEntryType] = useState<'subject' | 'custom' | 'misc'>('subject')
  const [subjectId, setSubjectId] = useState<string>('')
  const [entryName, setEntryName] = useState<string>('')
  const [entryColor, setEntryColor] = useState<string>('slate')
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [room, setRoom] = useState('')

  const router = useRouter()

  // Only show weekdays (Mon-Fri)
  const weekdays = DAYS_OF_WEEK.filter(d => d.value >= 1 && d.value <= 5)

  const resetForm = () => {
    setEntryType('subject')
    setSubjectId('')
    setEntryName('')
    setEntryColor('slate')
    setDayOfWeek(1)
    setStartTime('09:00')
    setEndTime('10:00')
    setRoom('')
    setEditing(null)
  }

  const handleAdd = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleEdit = (entry: TimetableEntry) => {
    setEditing(entry)
    if (entry.subject_id) {
      setEntryType('subject')
    } else if (entry.color) {
      setEntryType('misc')
    } else {
      setEntryType('custom')
    }
    setSubjectId(entry.subject_id || '')
    setEntryName(entry.name || '')
    setEntryColor(entry.color || 'slate')
    setDayOfWeek(entry.day_of_week)
    setStartTime(entry.start_time.slice(0, 5))
    setEndTime(entry.end_time.slice(0, 5))
    setRoom(entry.room || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const normalizedName = entryType === 'subject' ? null : entryName.trim() || null
    const entryData = {
      subject_id: entryType === 'subject' ? subjectId || null : null,
      name: normalizedName,
      color: entryType === 'misc' ? entryColor : null,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      room: room || null,
    }

    if (editing) {
      const { data, error } = await supabase
        .from('timetable_entries')
        .update(entryData)
        .eq('id', editing.id)
        .select()
        .single()

      if (!error && data) {
        onEntriesChange(entries.map(e => e.id === editing.id ? data : e))
      }
    } else {
      const { data, error } = await supabase
        .from('timetable_entries')
        .insert({
          ...entryData,
          user_id: user?.id,
        })
        .select()
        .single()

      if (!error && data) {
        onEntriesChange([...entries, data])
      }
    }

    resetForm()
    setDialogOpen(false)
    router.refresh()
  }

  const handleDelete = async (entry: TimetableEntry) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('timetable_entries')
      .delete()
      .eq('id', entry.id)

    if (!error) {
      onEntriesChange(entries.filter(e => e.id !== entry.id))
    }
  }

  const getSubjectForEntry = (entry: TimetableEntry) => {
    return subjects.find(s => s.id === entry.subject_id)
  }

  const getEntryLabel = (entry: TimetableEntry) => {
    const subject = getSubjectForEntry(entry)
    if (subject) return subject.name
    if (entry.name) return entry.name
    return 'Untitled'
  }

  const getColorClass = (entry: TimetableEntry) => {
    const subject = getSubjectForEntry(entry)
    if (subject) {
      return SUBJECT_COLORS.find(c => c.name === subject.color)?.class || 'bg-gray-500'
    }
    if (entry.color) {
      return SUBJECT_COLORS.find(c => c.name === entry.color)?.class || 'bg-gray-500'
    }
    return 'bg-gray-500'
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Get entries for a specific day, sorted by start time
  const getEntriesForDay = (day: number) => {
    return entries
      .filter(e => e.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  // Get current day (0 = Sunday, 1 = Monday, etc.)
  const today = new Date().getDay()

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Timetable
          </CardTitle>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Class
          </Button>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No classes scheduled yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Add your weekly class schedule.</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {weekdays.map(day => (
                <div key={day.value} className="space-y-2">
                  <div className={`text-center py-2 rounded-lg font-medium text-sm ${
                    day.value === today 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {day.label.slice(0, 3)}
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {getEntriesForDay(day.value).map(entry => {
                      return (
                        <div
                          key={entry.id}
                          className={`p-2 rounded-lg text-white relative group cursor-pointer ${getColorClass(entry)}`}
                          onClick={() => handleEdit(entry)}
                        >
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-white hover:bg-white/20"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(entry)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="font-medium text-xs truncate pr-6">
                            {getEntryLabel(entry)}
                          </p>
                          <p className="text-[10px] opacity-90 mt-1">
                            {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                          </p>
                          {entry.room && (
                            <p className="text-[10px] opacity-75 flex items-center gap-1 mt-1">
                              <MapPin className="h-2 w-2" />
                              {entry.room}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Class' : 'Add Class'}</DialogTitle>
            <DialogDescription className="sr-only">
              {editing ? 'Update a weekly class entry.' : 'Create a new weekly class entry.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Class Type</Label>
              <Select value={entryType} onValueChange={(value) => setEntryType(value as 'subject' | 'custom' | 'misc')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject">Linked Subject Class</SelectItem>
                  <SelectItem value="custom">Unlinked Class (e.g. TOK)</SelectItem>
                  <SelectItem value="misc">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {entryType === 'subject' && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${SUBJECT_COLORS.find(c => c.name === subject.color)?.class}`} />
                          {subject.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {entryType !== 'subject' && (
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder={entryType === 'misc' ? 'e.g. Miscellaneous Class' : 'e.g. TOK Session'}
                  value={entryName}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
            )}

            {entryType === 'misc' && (
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-4 gap-2">
                  {SUBJECT_COLORS.map(color => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setEntryColor(color.name)}
                      className={`h-8 rounded-md ${color.class} ${entryColor === color.name ? 'ring-2 ring-white/90 ring-offset-2 ring-offset-background' : ''}`}
                      aria-label={color.name}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekdays.map(day => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Room (optional)</Label>
              <Input
                placeholder="e.g. Room 201, Lab 3"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={
                  (entryType === 'subject' && !subjectId) ||
                  (entryType !== 'subject' && !entryName.trim())
                }
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
