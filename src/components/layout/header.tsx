'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface HeaderProps {
  email: string
}

export function Header({ email }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/cas', label: 'CAS' },
  ]

  return (
    <header className="border-b">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-xl">
              IB Planner
            </Link>
            <nav className="hidden sm:flex items-center gap-4">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm ${
                    pathname === item.href 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
        
        {/* Mobile nav */}
        <nav className="flex sm:hidden items-center gap-4 mt-4">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm ${
                pathname === item.href 
                  ? 'text-foreground font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}