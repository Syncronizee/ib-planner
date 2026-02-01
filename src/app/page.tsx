import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BookOpen, CheckCircle, BarChart3, Calendar } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 flex justify-between items-center">
          <span className="font-bold text-xl">IB Planner</span>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-4xl mx-auto px-4 sm:px-8 py-16 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Survive the IB Diploma
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Track your subjects, manage assignments, monitor your confidence levels, 
            and stay on top of deadlines. Built by an IB student, for IB students.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg">Start Planning</Button>
            </Link>
          </div>
        </section>

        <section className="border-t bg-muted/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Subject Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Track all 6 subjects with HL/SL designation and confidence levels.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Task Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Never miss a deadline. Track assignments by subject with due dates.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Confidence Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor how you feel about each subject over time.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Stay Organized</h3>
                  <p className="text-sm text-muted-foreground">
                    See overdue tasks at a glance. Know exactly what needs attention.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to get organized?</h2>
            <p className="text-muted-foreground mb-6">
              Join other IB students who are taking control of their diploma.
            </p>
            <Link href="/signup">
              <Button size="lg">Create Free Account</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Built for IB students</p>
      </footer>
    </div>
  )
}