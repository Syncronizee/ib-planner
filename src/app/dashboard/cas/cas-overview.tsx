'use client'

import { CASExperience, CASExperienceOutcome, CAS_LEARNING_OUTCOMES } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Circle } from 'lucide-react'

interface CASOverviewProps {
  experiences: CASExperience[]
  outcomes: CASExperienceOutcome[]
}

export function CASOverview({ experiences, outcomes }: CASOverviewProps) {
  // Calculate hours per strand
  const creativityHours = experiences
    .filter(e => e.is_creativity)
    .reduce((sum, e) => sum + Number(e.hours), 0)
  const activityHours = experiences
    .filter(e => e.is_activity)
    .reduce((sum, e) => sum + Number(e.hours), 0)
  const serviceHours = experiences
    .filter(e => e.is_service)
    .reduce((sum, e) => sum + Number(e.hours), 0)
  const totalHours = creativityHours + activityHours + serviceHours

  // Calculate which learning outcomes have been demonstrated
  const demonstratedOutcomes = new Set(outcomes.map(o => o.outcome_number))

  // CAS Project status
  const hasProject = experiences.some(e => e.is_cas_project)
  const projectExperiences = experiences.filter(e => e.is_cas_project)

  return (
    <div className="space-y-6">
      {/* Hours by Strand */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Creativity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{creativityHours}h</p>
            <Progress 
              value={totalHours > 0 ? (creativityHours / totalHours) * 100 : 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{activityHours}h</p>
            <Progress 
              value={totalHours > 0 ? (activityHours / totalHours) * 100 : 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Service</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{serviceHours}h</p>
            <Progress 
              value={totalHours > 0 ? (serviceHours / totalHours) * 100 : 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Learning Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Learning Outcomes</CardTitle>
          <p className="text-sm text-muted-foreground">
            {demonstratedOutcomes.size}/7 demonstrated
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {CAS_LEARNING_OUTCOMES.map((outcome) => (
              <div 
                key={outcome.number}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  demonstratedOutcomes.has(outcome.number) 
                    ? 'bg-green-50 dark:bg-green-950' 
                    : 'bg-muted/50'
                }`}
              >
                {demonstratedOutcomes.has(outcome.number) ? (
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {outcome.number}. {outcome.short}
                  </p>
                  <p className="text-xs text-muted-foreground">{outcome.full}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CAS Project Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CAS Project</CardTitle>
        </CardHeader>
        <CardContent>
          {hasProject ? (
            <div>
              <p className="text-sm text-green-600 font-medium mb-2">
                ✓ Project identified ({projectExperiences.length} experience{projectExperiences.length !== 1 ? 's' : ''})
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {projectExperiences.map(exp => (
                  <li key={exp.id}>• {exp.title}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No CAS project identified yet. Mark experiences as part of your CAS project when adding them.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}