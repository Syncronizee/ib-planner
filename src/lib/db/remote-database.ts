import { createClient } from '@/lib/supabase/client'
import type { DatabaseService } from '@/lib/db/types'
import type { Assessment, Subject, Task } from '@/lib/types'

function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

function toPatch<T extends Record<string, unknown>>(data: Partial<T>) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => !isNullOrUndefined(value)))
}

export class RemoteDatabaseService implements DatabaseService {
  async getSubjects(userId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as Subject[]
  }

  async getSubjectById(id: string, userId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }

      throw error
    }

    return data as Subject
  }

  async createSubject(userId: string, data: Partial<Subject>) {
    const supabase = createClient()
    const payload = {
      user_id: userId,
      name: data.name ?? 'Untitled Subject',
      level: data.level ?? 'SL',
      color: data.color ?? 'slate',
      confidence: data.confidence ?? 3,
      current_grade: data.current_grade ?? null,
      predicted_grade: data.predicted_grade ?? null,
      target_grade: data.target_grade ?? null,
      teacher_name: data.teacher_name ?? null,
      teacher_email: data.teacher_email ?? null,
      notes: data.notes ?? null,
    }

    const { data: created, error } = await supabase.from('subjects').insert(payload).select('*').single()
    if (error) throw error
    return created as Subject
  }

  async updateSubject(id: string, userId: string, data: Partial<Subject>) {
    const supabase = createClient()
    const { data: updated, error } = await supabase
      .from('subjects')
      .update(toPatch<Subject>(data))
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    return updated as Subject
  }

  async deleteSubject(id: string, userId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('subjects').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
  }

  async getTasks(userId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) throw error
    return (data ?? []) as Task[]
  }

  async getTasksBySubject(userId: string, subjectId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('subject_id', subjectId)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) throw error
    return (data ?? []) as Task[]
  }

  async createTask(userId: string, data: Partial<Task>) {
    const supabase = createClient()
    const payload = {
      user_id: userId,
      subject_id: data.subject_id ?? null,
      title: data.title ?? 'Untitled Task',
      description: data.description ?? null,
      due_date: data.due_date ?? null,
      priority: data.priority ?? 'medium',
      category: data.category ?? 'other',
      is_completed: data.is_completed ?? false,
      linked_assessment_id: data.linked_assessment_id ?? null,
      completed_at: data.completed_at ?? null,
      energy_level: data.energy_level ?? null,
    }

    const { data: created, error } = await supabase.from('tasks').insert(payload).select('*').single()
    if (error) throw error
    return created as Task
  }

  async updateTask(id: string, userId: string, data: Partial<Task>) {
    const supabase = createClient()
    const { data: updated, error } = await supabase
      .from('tasks')
      .update(toPatch<Task>(data))
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    return updated as Task
  }

  async deleteTask(id: string, userId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
  }

  async getAssessments(userId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true, nullsFirst: false })

    if (error) throw error
    return (data ?? []) as Assessment[]
  }

  async getAssessmentsBySubject(userId: string, subjectId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', userId)
      .eq('subject_id', subjectId)
      .order('date', { ascending: true, nullsFirst: false })

    if (error) throw error
    return (data ?? []) as Assessment[]
  }

  async createAssessment(userId: string, data: Partial<Assessment>) {
    const supabase = createClient()
    const payload = {
      user_id: userId,
      subject_id: data.subject_id ?? null,
      title: data.title ?? 'Untitled Assessment',
      type: data.type ?? 'other',
      score: data.score ?? null,
      max_score: data.max_score ?? null,
      percentage: data.percentage ?? null,
      weight: data.weight ?? null,
      date: data.date ?? null,
      notes: data.notes ?? null,
      is_completed: data.is_completed ?? false,
      linked_task_id: data.linked_task_id ?? null,
    }

    const { data: created, error } = await supabase.from('assessments').insert(payload).select('*').single()
    if (error) throw error
    return created as Assessment
  }

  async updateAssessment(id: string, userId: string, data: Partial<Assessment>) {
    const supabase = createClient()
    const { data: updated, error } = await supabase
      .from('assessments')
      .update(toPatch<Assessment>(data))
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    return updated as Assessment
  }

  async deleteAssessment(id: string, userId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('assessments').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
  }
}
