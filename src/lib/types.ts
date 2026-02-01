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