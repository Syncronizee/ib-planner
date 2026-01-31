'use client'

import { useState } from 'react'
import { Task, Subject } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { TaskItem } from '@/components/tasks/task-item'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TasksSectionProps {
  initialTasks: Task[]
  subjects: Subject[]
}

export function TasksSection({ initialTasks, subjects }: TasksSectionProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const router = useRouter()

  const handleSave = async (data: { title: string; description: string; subject_id: string | null; due_date: string | null }) => {
    const supabase = createClient()

    if (editingTask) {
      const { error } = await supabase
        .from('tasks')
        .update(data)
        .eq('id', editingTask.id)

      if (!error) {
        setTasks(tasks.map(t => 
          t.id === editingTask.id ? { ...t, ...data } : t
        ))
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({ ...data, user_id: user?.id })
        .select()
        .single()

      if (!error && newTask) {
        setTasks([...tasks, newTask])
      }
    }
    
    setEditingTask(null)
    router.refresh()
  }

  const handleToggle = async (task: Task) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: !task.is_completed })
      .eq('id', task.id)

    if (!error) {
      setTasks(tasks.map(t => 
        t.id === task.id ? { ...t, is_completed: !t.is_completed } : t
      ))
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  const handleDelete = async (task: Task) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)

    if (!error) {
      setTasks(tasks.filter(t => t.id !== task.id))
    }
  }

  const handleAdd = () => {
    setEditingTask(null)
    setDialogOpen(true)
  }

  const incompleteTasks = tasks.filter(t => !t.is_completed)
  const completedTasks = tasks.filter(t => t.is_completed)

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No tasks yet. Add your first task to get started.</p>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Task
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {incompleteTasks.length > 0 && (
            <div className="space-y-2">
              {incompleteTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  subject={subjects.find(s => s.id === task.subject_id)}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Completed ({completedTasks.length})
              </h3>
              <div className="space-y-2">
                {completedTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    subject={subjects.find(s => s.id === task.subject_id)}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        subjects={subjects}
        onSave={handleSave}
      />
    </section>
  )
}