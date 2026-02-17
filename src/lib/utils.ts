import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Keep numeric text literal across themes/fonts.
export function formatDotoNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return String(value)
}
