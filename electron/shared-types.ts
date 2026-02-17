export type SessionUser = {
  id: string
  email: string | null
}

export type StoredAuthSession = {
  accessToken: string
  refreshToken: string
  expiresAt: number | null
  user: SessionUser
}

export type SyncStatus = {
  online: boolean
  syncing: boolean
  lastSyncedAt: string | null
  pendingChanges: number
  error: string | null
}

export type Subject = {
  id: string
  user_id: string
  name: string
  level: 'HL' | 'SL'
  confidence: number
  color: string
  current_grade: number | null
  predicted_grade: number | null
  target_grade: number | null
  teacher_name: string | null
  teacher_email: string | null
  notes: string | null
  created_at: string
}

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  is_completed: boolean
  priority: 'low' | 'medium' | 'high'
  subject_id: string | null
  category: 'homework' | 'assessment' | 'college_prep' | 'personal' | 'project' | 'revision' | 'other'
  linked_assessment_id: string | null
  completed_at: string | null
  energy_level: 'high' | 'medium' | 'low' | null
  created_at: string
}

export type Assessment = {
  id: string
  user_id: string
  subject_id: string
  title: string
  type: 'IA' | 'test' | 'exam' | 'quiz' | 'essay' | 'presentation' | 'homework' | 'project' | 'other'
  score: number | null
  max_score: number | null
  percentage: number | null
  weight: number | null
  date: string | null
  notes: string | null
  is_completed: boolean
  linked_task_id: string | null
  created_at: string
}
