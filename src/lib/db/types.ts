import type { Assessment, Subject, Task } from '@/lib/types'

export type SyncTable =
  | 'subjects'
  | 'tasks'
  | 'assessments'
  | 'grade_history'
  | 'timetable_entries'
  | 'study_resources'
  | 'syllabus_topics'
  | 'weakness_tags'
  | 'error_logs'
  | 'notes'
  | 'note_images'
  | 'energy_checkins'
  | 'weekly_plans'
  | 'study_sessions'
  | 'scheduled_study_sessions'
  | 'school_events'
  | 'cas_experiences'
  | 'cas_reflections'
  | 'cas_experience_outcomes'
  | 'tok_essays'
  | 'tok_exhibitions'
  | 'tok_exhibition_objects'
  | 'tok_knowledge_questions'
  | 'tok_notes'
  | 'tok_prompts'

export type SyncStatus = {
  online: boolean
  syncing: boolean
  lastSyncedAt: string | null
  pendingChanges: number
  error: string | null
}

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

export interface DatabaseService {
  // Subjects
  getSubjects(userId: string): Promise<Subject[]>
  getSubjectById(id: string, userId: string): Promise<Subject | null>
  createSubject(userId: string, data: Partial<Subject>): Promise<Subject>
  updateSubject(id: string, userId: string, data: Partial<Subject>): Promise<Subject>
  deleteSubject(id: string, userId: string): Promise<void>

  // Tasks
  getTasks(userId: string): Promise<Task[]>
  getTasksBySubject(userId: string, subjectId: string): Promise<Task[]>
  createTask(userId: string, data: Partial<Task>): Promise<Task>
  updateTask(id: string, userId: string, data: Partial<Task>): Promise<Task>
  deleteTask(id: string, userId: string): Promise<void>

  // Assessments
  getAssessments(userId: string): Promise<Assessment[]>
  getAssessmentsBySubject(userId: string, subjectId: string): Promise<Assessment[]>
  createAssessment(userId: string, data: Partial<Assessment>): Promise<Assessment>
  updateAssessment(id: string, userId: string, data: Partial<Assessment>): Promise<Assessment>
  deleteAssessment(id: string, userId: string): Promise<void>
}

export interface SyncController {
  getSyncStatus(): Promise<SyncStatus>
  syncNow(): Promise<SyncStatus>
  setOnlineState(online: boolean): Promise<void>
}

export interface AuthSessionController {
  storeSession(session: StoredAuthSession): Promise<void>
  clearSession(): Promise<void>
  getLastUser(): Promise<SessionUser | null>
}
