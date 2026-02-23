import Link from 'next/link'
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Clock3,
  Brain,
  Sparkles,
  Target,
  Music2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isElectronRequestHeaders } from '@/lib/electron/request'

const features = [
  {
    title: 'Subject Tracking',
    description: 'Keep all 6 IB subjects, confidence ratings, grade targets, and weaknesses in one place.',
    icon: BookOpen,
  },
  {
    title: 'Task + Objective Planning',
    description: 'Log homework, independent study objectives, and custom session goals without extra setup friction.',
    icon: CheckCircle,
  },
  {
    title: 'Focus Sessions',
    description: 'Run deep-work sessions with a timer, ambient mode, optional Spotify, and automatic session logging.',
    icon: Clock3,
  },
  {
    title: 'Calendar + School Events',
    description: 'Schedule study sessions and school events directly from dashboard widgets or the full planner view.',
    icon: Calendar,
  },
  {
    title: 'Proactive Score Engine',
    description: 'Reward independent work, account for weak/strong subjects, and get a clearer signal of consistency.',
    icon: Target,
  },
  {
    title: 'Energy-Based Suggestions',
    description: 'Match session recommendations to your current energy so you always know what to tackle next.',
    icon: Brain,
  },
]

export default async function HomePage() {
  const isElectronRequest = isElectronRequestHeaders(await headers())

  if (isElectronRequest) {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const loginHref = '/login'
  const signupHref = '/signup'

  return (
    <div className="min-h-screen app-bg text-[var(--fg)]">
      <header className="token-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl border border-[var(--border)] bg-[var(--muted)]/70 flex items-center justify-center">
              <span className="h-3 w-3 rounded-full bg-[var(--accent)]" />
            </div>
            <span className="font-semibold text-[var(--fg)]">Scholar Board</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={loginHref}>
              <Button variant="ghost" className="text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)]">
                Log in
              </Button>
            </Link>
            <Link href={signupHref}>
              <Button className="token-btn-accent">{user ? 'Open Dashboard' : 'Get Started'}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-12">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)]/70 px-3 py-1 text-xs uppercase tracking-wide text-[var(--muted-fg)] mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                Built for IB students
              </div>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--fg)] leading-tight">
                Plan better.
                <br />
                Study deeper.
                <br />
                Stay ahead of IB deadlines.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[var(--muted-fg)] max-w-xl">
                Scholar Board combines subjects, tasks, focus sessions, proactive scoring, and calendar scheduling into one calm workspace.
                You spend less time organizing and more time making progress.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href={signupHref}>
                  <Button size="lg" className="token-btn-accent">{user ? 'Go to Dashboard' : 'Create Account'}</Button>
                </Link>
                <Link href="/dashboard/calendar">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-[var(--muted)] border-[var(--border)] text-[var(--fg)] hover:bg-[var(--card)]"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Planner
                  </Button>
                </Link>
              </div>
            </div>

            <div className="token-card p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-semibold text-[var(--card-fg)]">What you can do today</h2>
              <div className="space-y-3">
                {[
                  'Start a focus session with timer + ambient mode',
                  'Quick-log a completed session in under 5 seconds',
                  'Schedule study blocks and school events from dashboard',
                  'Track confidence and weaknesses per subject',
                  'See proactive score shifts from independent study habits',
                ].map((item) => (
                  <div key={item} className="token-row px-3 py-2.5 text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[var(--accent)] shrink-0" />
                    <span className="text-[var(--card-fg)]">{item}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[var(--border)] text-sm text-[var(--muted-fg)] flex items-center gap-2">
                <Music2 className="h-4 w-4" />
                Optional Spotify embeds for focus sessions
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="glass-card p-5">
                  <div className="h-10 w-10 rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--card-fg)] mb-2">{feature.title}</h3>
                  <p className="text-sm text-[var(--muted-fg)] leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="border-t border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--fg)]">Ready to run your IB year with less chaos?</h2>
              <p className="text-[var(--muted-fg)] mt-1">Open your planner and start the next focused session.</p>
            </div>
            <Link href={signupHref}>
              <Button size="lg" className="token-btn-accent">{user ? 'Open Dashboard' : 'Start Free'}</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
