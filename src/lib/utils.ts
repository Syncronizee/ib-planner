import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Replace 0s with Os for Doto font display
export function formatDotoNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return String(value).replace(/0/g, 'O')
}