export type Subject = {
  id: string
  user_id: string
  name: string
  level: 'HL' | 'SL'
  confidence: number
  color: string
  created_at: string
}

export type Task = {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  description: string | null
  due_date: string | null
  is_completed: boolean
  created_at: string
}

export const SUBJECT_COLORS = [
  { name: 'slate', class: 'bg-slate-500' },
  { name: 'red', class: 'bg-red-500' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'amber', class: 'bg-amber-500' },
  { name: 'green', class: 'bg-green-500' },
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'pink', class: 'bg-pink-500' },
] as const

export type CASExperience = {
  id: string
  user_id: string
  title: string
  description: string | null
  date: string
  hours: number
  is_creativity: boolean
  is_activity: boolean
  is_service: boolean
  is_cas_project: boolean
  created_at: string
}

export type CASReflection = {
  id: string
  user_id: string
  experience_id: string
  content: string
  date: string
  created_at: string
}

export type CASExperienceOutcome = {
  id: string
  user_id: string
  experience_id: string
  outcome_number: number
  created_at: string
}

export const CAS_LEARNING_OUTCOMES = [
  { number: 1, short: 'Strengths & Growth', full: 'Identify own strengths and develop areas for personal growth' },
  { number: 2, short: 'New Challenges', full: 'Demonstrate that challenges have been undertaken, developing new skills' },
  { number: 3, short: 'Plan & Initiate', full: 'Demonstrate how to initiate and plan a CAS experience' },
  { number: 4, short: 'Collaboration', full: 'Show commitment to and perseverance in CAS experiences' },
  { number: 5, short: 'Perseverance', full: 'Demonstrate the skills and recognize the benefits of working collaboratively' },
  { number: 6, short: 'Global Significance', full: 'Demonstrate engagement with issues of global significance' },
  { number: 7, short: 'Ethics', full: 'Recognize and consider the ethics of choices and actions' },
] as const

export type TOKEssay = {
  id: string
  user_id: string
  prescribed_title: string | null
  thesis: string | null
  outline: string | null
  status: 'not_started' | 'planning' | 'drafting' | 'revising' | 'complete'
  word_count: number
  deadline: string | null
  created_at: string
}

export type TOKExhibition = {
  id: string
  user_id: string
  prompt: string | null
  status: 'not_started' | 'selecting_objects' | 'writing_commentaries' | 'complete'
  deadline: string | null
  created_at: string
}

export type TOKExhibitionObject = {
  id: string
  user_id: string
  exhibition_id: string
  object_number: number
  title: string | null
  description: string | null
  commentary: string | null
  created_at: string
}

export type TOKKnowledgeQuestion = {
  id: string
  user_id: string
  question: string
  aok: string[]
  wok: string[]
  notes: string | null
  created_at: string
}

export type TOKNote = {
  id: string
  user_id: string
  category_type: 'aok' | 'wok'
  category_name: string
  content: string | null
  created_at: string
}

export const AREAS_OF_KNOWLEDGE = [
  'Mathematics',
  'Natural Sciences',
  'Human Sciences',
  'Arts',
  'History',
  'Ethics',
] as const

export const WAYS_OF_KNOWING = [
  'Reason',
  'Emotion',
  'Language',
  'Perception',
  'Imagination',
  'Faith',
  'Intuition',
  'Memory',
] as const

export const TOK_ESSAY_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'planning', label: 'Planning' },
  { value: 'drafting', label: 'Drafting' },
  { value: 'revising', label: 'Revising' },
  { value: 'complete', label: 'Complete' },
] as const

export const TOK_EXHIBITION_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'selecting_objects', label: 'Selecting Objects' },
  { value: 'writing_commentaries', label: 'Writing Commentaries' },
  { value: 'complete', label: 'Complete' },
] as const