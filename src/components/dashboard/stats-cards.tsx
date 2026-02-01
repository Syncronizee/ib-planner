import { Subject, Task } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { isPast, isToday } from 'date-fns'

interface StatsCardsProps {
  subjects: Subject[]
  tasks: Task[]
}

export function StatsCards({ subjects, tasks }: StatsCardsProps) {
  const completedTasks = tasks.filter(t => t.is_completed).length
  const pendingTasks = tasks.filter(t => !t.is_completed).length
  const overdueTasks = tasks.filter(t => 
    !t.is_completed && 
    t.due_date && 
    isPast(new Date(t.due_date)) && 
    !isToday(new Date(t.due_date))
  ).length

  const avgConfidence = subjects.length > 0
    ? Math.round(subjects.reduce((acc, s) => acc + s.confidence, 0) / subjects.length * 10) / 10
    : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Subjects</span>
          </div>
          <p className="text-2xl font-bold mt-1">{subjects.length}/6</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold mt-1">{pendingTasks}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold mt-1">{completedTasks}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <AlertCircle className={`h-4 w-4 ${overdueTasks > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className="text-sm text-muted-foreground">Overdue</span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${overdueTasks > 0 ? 'text-destructive' : ''}`}>
            {overdueTasks}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}