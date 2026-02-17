import type { DatabaseService } from '@/lib/db/types'
import type { Assessment, Subject, Task } from '@/lib/types'

type DbMethod =
  | 'getSubjects'
  | 'getSubjectById'
  | 'createSubject'
  | 'updateSubject'
  | 'deleteSubject'
  | 'getTasks'
  | 'getTasksBySubject'
  | 'createTask'
  | 'updateTask'
  | 'deleteTask'
  | 'getAssessments'
  | 'getAssessmentsBySubject'
  | 'createAssessment'
  | 'updateAssessment'
  | 'deleteAssessment'

function getElectronBridge() {
  if (
    typeof window === 'undefined' ||
    !window.electronAPI ||
    (!window.electronAPI.db?.invoke && !window.electronAPI.dbInvoke)
  ) {
    throw new Error('Local database bridge is unavailable outside Electron renderer')
  }

  return window.electronAPI
}

export class ElectronLocalDatabaseService implements DatabaseService {
  private async invoke<T>(method: DbMethod, ...args: unknown[]) {
    const bridge = getElectronBridge()
    if (bridge.db?.invoke) {
      return bridge.db.invoke<T>(method, args)
    }

    return bridge.dbInvoke<T>(method, args)
  }

  getSubjects(userId: string) {
    return this.invoke<Subject[]>('getSubjects', userId)
  }

  getSubjectById(id: string, userId: string) {
    return this.invoke<Subject | null>('getSubjectById', id, userId)
  }

  createSubject(userId: string, data: Partial<Subject>) {
    return this.invoke<Subject>('createSubject', userId, data)
  }

  updateSubject(id: string, userId: string, data: Partial<Subject>) {
    return this.invoke<Subject>('updateSubject', id, userId, data)
  }

  async deleteSubject(id: string, userId: string) {
    await this.invoke<void>('deleteSubject', id, userId)
  }

  getTasks(userId: string) {
    return this.invoke<Task[]>('getTasks', userId)
  }

  getTasksBySubject(userId: string, subjectId: string) {
    return this.invoke<Task[]>('getTasksBySubject', userId, subjectId)
  }

  createTask(userId: string, data: Partial<Task>) {
    return this.invoke<Task>('createTask', userId, data)
  }

  updateTask(id: string, userId: string, data: Partial<Task>) {
    return this.invoke<Task>('updateTask', id, userId, data)
  }

  async deleteTask(id: string, userId: string) {
    await this.invoke<void>('deleteTask', id, userId)
  }

  getAssessments(userId: string) {
    return this.invoke<Assessment[]>('getAssessments', userId)
  }

  getAssessmentsBySubject(userId: string, subjectId: string) {
    return this.invoke<Assessment[]>('getAssessmentsBySubject', userId, subjectId)
  }

  createAssessment(userId: string, data: Partial<Assessment>) {
    return this.invoke<Assessment>('createAssessment', userId, data)
  }

  updateAssessment(id: string, userId: string, data: Partial<Assessment>) {
    return this.invoke<Assessment>('updateAssessment', id, userId, data)
  }

  async deleteAssessment(id: string, userId: string) {
    await this.invoke<void>('deleteAssessment', id, userId)
  }
}
