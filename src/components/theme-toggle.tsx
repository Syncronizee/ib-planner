'use client'

import { Palette } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme, themes } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Switch theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((themeOption) => (
          <DropdownMenuItem key={themeOption.id} onClick={() => setTheme(themeOption.id)}>
            <span className={theme === themeOption.id ? 'font-semibold' : ''}>{themeOption.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
