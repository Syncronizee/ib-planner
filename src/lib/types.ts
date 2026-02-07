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

export const ERROR_TYPES = [
  { value: 'content_gap', label: 'Content Gap', description: 'Missing knowledge or understanding' },
  { value: 'logic_gap', label: 'Logic Gap', description: 'Flawed reasoning or problem-solving' },
  { value: 'careless', label: 'Careless Error', description: 'Silly mistakes, misreading, calculation errors' },
] as const

export const WEAKNESS_TYPES = [
  { value: 'content', label: 'Content', description: 'Topics or concepts you don\'t understand' },
  { value: 'logic', label: 'Logic', description: 'Problem-solving or reasoning skills' },
] as const

export type GradeHistory = {
  id: string
  user_id: string
  subject_id: string
  grade: number
  grade_type: 'current' | 'predicted' | 'test' | 'exam' | 'assignment'
  label: string | null
  date: string
  created_at: string
}

export type Assessment = {
  id: string
  user_id: string
  subject_id: string
  title: string
  type: 'IA' | 'test' | 'exam' | 'quiz' | 'essay' | 'presentation' | 'homework' | 'other'
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

export type StudyResource = {
  id: string
  user_id: string
  subject_id: string
  title: string
  url: string | null
  type: 'video' | 'article' | 'pdf' | 'website' | 'book' | 'other'
  notes: string | null
  created_at: string
}

export type SyllabusTopic = {
  id: string
  user_id: string
  subject_id: string
  topic_name: string
  unit_number: number | null
  is_completed: boolean
  confidence: number
  notes: string | null
  created_at: string
}

export type WeaknessTag = {
  id: string
  user_id: string
  subject_id: string
  tag: string
  description: string | null
  weakness_type: 'content' | 'logic'
  is_resolved: boolean
  created_at: string
}

export type ErrorLog = {
  id: string
  user_id: string
  subject_id: string
  concept: string
  error_description: string
  correction: string | null
  error_type: 'content_gap' | 'logic_gap' | 'careless'
  source: string | null
  date: string
  is_resolved: boolean
  created_at: string
}

export type TimetableEntry = {
  id: string
  user_id: string
  subject_id: string | null
  day_of_week: number
  start_time: string
  end_time: string
  room: string | null
  notes: string | null
  created_at: string
}

export const ASSESSMENT_TYPES = [
  { value: 'IA', label: 'Internal Assessment' },
  { value: 'test', label: 'Test' },
  { value: 'exam', label: 'Exam' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'essay', label: 'Essay' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'homework', label: 'Homework' },
  { value: 'other', label: 'Other' },
] as const

export const RESOURCE_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'article', label: 'Article' },
  { value: 'pdf', label: 'PDF' },
  { value: 'website', label: 'Website' },
  { value: 'book', label: 'Book' },
  { value: 'other', label: 'Other' },
] as const

export const IB_GRADES = [
  { value: 7, label: '7 - Excellent' },
  { value: 6, label: '6 - Very Good' },
  { value: 5, label: '5 - Good' },
  { value: 4, label: '4 - Satisfactory' },
  { value: 3, label: '3 - Mediocre' },
  { value: 2, label: '2 - Poor' },
  { value: 1, label: '1 - Very Poor' },
] as const

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  is_completed: boolean
  priority: 'low' | 'medium' | 'high'
  subject_id: string | null
  category: TaskCategory
  linked_assessment_id: string | null
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

export type TOKPrompt = {
  id: string
  user_id: string | null
  type: 'essay' | 'exhibition'
  prompt: string
  year: string | null
  is_default: boolean
  created_at: string
}

export const DEFAULT_TOK_ESSAY_PROMPTS_2025 = [
  "Is subjectivity overly celebrated in the arts but unfairly dismissed in history? Discuss with reference to the arts and history.",
  "How can we reconcile the competing demands of freedom and security in the production of knowledge? Discuss with reference to two areas of knowledge.",
  "To what extent do you agree that there is no significant difference between hypothesis and speculation? Discuss with reference to the natural sciences and one other area of knowledge.",
  "Do we need custodians of knowledge? Discuss with reference to two areas of knowledge.",
  "Are we too quick to assume that the most recent evidence is inevitably the strongest? Discuss with reference to the natural sciences and one other area of knowledge.",
  "What forms of knowledge might enable us to resolve genuine moral disagreements? Discuss with reference to ethics and one other area of knowledge.",
] as const

export const DEFAULT_TOK_EXHIBITION_PROMPTS = [
  "What counts as knowledge?",
  "Are some types of knowledge more useful than others?",
  "What features of knowledge have an impact on its reliability?",
  "On what grounds might we doubt a claim?",
  "What counts as good evidence for a claim?",
  "How does the way that we organize or classify knowledge affect what we know?",
  "What are the implications of having, or not having, knowledge?",
  "To what extent is certainty attainable?",
  "Are some types of knowledge less open to interpretation than others?",
  "What challenges are raised by the dissemination and/or communication of knowledge?",
  "Can new knowledge change established values or beliefs?",
  "Is bias inevitable in the production of knowledge?",
  "How can we know that current knowledge is an improvement upon past knowledge?",
  "Does some knowledge belong only to particular communities of knowers?",
  "What is the relationship between knowledge and culture?",
  "What role do experts play in influencing our consumption or acquisition of knowledge?",
  "How important are material tools in the production or acquisition of knowledge?",
  "How might the context in which knowledge is presented influence whether it is accepted or rejected?",
  "How can we distinguish between knowledge, belief and opinion?",
  "Does our knowledge depend on our interactions with other knowers?",
  "What is the relationship between personal experience and knowledge?",
  "What is the relationship between knowledge and language?",
  "How does the context in which knowledge is presented influence its reception?",
  "What role does imagination play in producing knowledge about the world?",
  "How can we judge when evidence is adequate?",
  "What makes a good explanation?",
  "Does all knowledge impose ethical obligations on those who know it?",
  "To what extent is objectivity possible in the production or acquisition of knowledge?",
  "Who owns knowledge?",
  "What role does technology play in shaping what we consider to be knowledge?",
  "How do our senses shape what we consider to be knowledge?",
  "How do our values influence what we consider to be knowledge?",
  "When, if ever, is it justifiable to dismiss counterclaims?",
  "How can we distinguish between good and bad interpretations?",
  "Is knowledge always a representation of something else?",
] as const

export type Note = {
  id: string
  user_id: string
  subject_id: string
  topic_id: string | null
  title: string
  content: any // Tiptap JSON content
  plain_text: string | null
  has_drawing: boolean
  drawing_data: any | null // Excalidraw JSON data
  created_at: string
  updated_at: string
}

export type NoteImage = {
  id: string
  user_id: string
  note_id: string
  storage_path: string
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export type NoteWithTopic = Note & {
  syllabus_topics?: SyllabusTopic | null
}

export const TASK_CATEGORIES = [
  { value: 'homework', label: 'Homework', color: 'bg-blue-500' },
  { value: 'assessment', label: 'Assessment', color: 'bg-red-500' },
  { value: 'college_prep', label: 'College Prep', color: 'bg-purple-500' },
  { value: 'personal', label: 'Personal', color: 'bg-green-500' },
  { value: 'project', label: 'Project', color: 'bg-orange-500' },
  { value: 'revision', label: 'Revision', color: 'bg-amber-500' },
  { value: 'other', label: 'Other', color: 'bg-gray-500' },
] as const

export type TaskCategory = 'homework' | 'assessment' | 'college_prep' | 'personal' | 'project' | 'revision' | 'other'