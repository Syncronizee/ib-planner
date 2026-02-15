import { EnergyLevel } from './types'

export const TASK_BANK: Record<EnergyLevel, string[]> = {
  high: [
    'Complete a full past paper under timed conditions',
    'Learn a new topic from scratch',
    'Tackle the hardest questions from your weakest subject',
    'Create concept maps connecting multiple topics',
    'Do questions that require multi-step reasoning',
    'Practice extended response questions (10+ markers)',
  ],
  medium: [
    'Do 10-15 standard practice questions',
    'Review and correct previous mistakes',
    'Active flashcard review (covering answers, testing yourself)',
    'Work through textbook examples',
    'Do past paper questions by topic (not full papers)',
    'Summarize a chapter in your own words',
  ],
  low: [
    'Do 1-5 easy practice questions',
    'Passive flashcard review',
    'Re-read your own notes',
    'Organize/clean up study materials',
    'Make a study plan for tomorrow',
    'Review mark schemes without doing questions',
    'Listen to a podcast or look at notes',
    'Flip through textbook diagrams',
    'Mental visualization of processes',
  ],
}

export function getTaskBankSuggestions(energy: EnergyLevel, count = 3): string[] {
  return TASK_BANK[energy].slice(0, count)
}
