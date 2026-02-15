export type ThemeId =
  | 'simple-light'
  | 'simple-dark'
  | 'minimal-focus'
  | 'tactical-command-center'
  | 'academic-elite'
  | 'energetic-momentum'

export type ThemeOption = {
  id: ThemeId
  label: string
}

export const themeOptions: ThemeOption[] = [
  { id: 'simple-light', label: 'Simple Light' },
  { id: 'simple-dark', label: 'Simple Dark' },
  { id: 'minimal-focus', label: 'Minimal Focus' },
  { id: 'tactical-command-center', label: 'Tactical / Command Center' },
  { id: 'academic-elite', label: 'Academic Elite' },
  { id: 'energetic-momentum', label: 'Energetic Momentum' },
]

export type ThemeVars = Record<
  '--bg' | '--fg' | '--muted' | '--muted-fg' | '--card' | '--card-fg' | '--border' | '--accent' | '--accent-fg' | '--ring',
  string
>

export const themeVars: Record<ThemeId, ThemeVars> = {
  'simple-light': {
    '--bg': '#FFFFFF',
    '--fg': '#111827',
    '--muted': '#F3F4F6',
    '--muted-fg': '#6B7280',
    '--card': '#FFFFFF',
    '--card-fg': '#111827',
    '--border': '#E5E7EB',
    '--accent': '#0EA5E9',
    '--accent-fg': '#FFFFFF',
    '--ring': '#93C5FD',
  },
  'simple-dark': {
    '--bg': '#0B0F14',
    '--fg': '#E5E7EB',
    '--muted': '#111827',
    '--muted-fg': '#9CA3AF',
    '--card': '#0F172A',
    '--card-fg': '#E5E7EB',
    '--border': '#1F2937',
    '--accent': '#60A5FA',
    '--accent-fg': '#081018',
    '--ring': '#93C5FD',
  },
  'minimal-focus': {
    '--bg': '#E8E8E4',
    '--fg': '#1C1C1C',
    '--muted': '#DEDEDA',
    '--muted-fg': '#5F6672',
    '--card': '#F7F7F4',
    '--card-fg': '#1C1C1C',
    '--border': '#D7DADF',
    '--accent': '#4A6FA5',
    '--accent-fg': '#FFFFFF',
    '--ring': '#8EB4E4',
  },
  'tactical-command-center': {
    '--bg': '#0F1115',
    '--fg': '#E6E9EF',
    '--muted': '#141822',
    '--muted-fg': '#9AA4B2',
    '--card': '#1A1D23',
    '--card-fg': '#E6E9EF',
    '--border': '#2A2F3A',
    '--accent': '#22D3EE',
    '--accent-fg': '#041014',
    '--ring': '#67E8F9',
  },
  'academic-elite': {
    '--bg': '#F8F4EC',
    '--fg': '#1B1B1F',
    '--muted': '#F0E8DA',
    '--muted-fg': '#6B5B4B',
    '--card': '#FFF9EF',
    '--card-fg': '#1B1B1F',
    '--border': '#E3D7C6',
    '--accent': '#0F2A47',
    '--accent-fg': '#F8F4EC',
    '--ring': '#BFA77A',
  },
  'energetic-momentum': {
    '--bg': '#EFE7DC',
    '--fg': '#1D1A17',
    '--muted': '#E2D5C6',
    '--muted-fg': '#6F6257',
    '--card': '#FFF7EE',
    '--card-fg': '#1D1A17',
    '--border': '#D6C2AE',
    '--accent': '#F97316',
    '--accent-fg': '#FFFFFF',
    '--ring': '#FB923C',
  },
}

export const THEME_STORAGE_KEY = 'ib-planner-theme'
export const DEFAULT_THEME: ThemeId = 'simple-dark'
