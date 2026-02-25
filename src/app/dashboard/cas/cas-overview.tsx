'use client'

import { CASExperience, CASExperienceOutcome, CAS_LEARNING_OUTCOMES } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const totalForBars = totalHours > 0 ? totalHours : 1
  const creativityPercent = Math.max(0, Math.min(100, (creativityHours / totalForBars) * 100))
  const activityPercent = Math.max(0, Math.min(100, (activityHours / totalForBars) * 100))
  const servicePercent = Math.max(0, Math.min(100, (serviceHours / totalForBars) * 100))

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
            <CardTitle className="text-sm font-medium text-[var(--muted-fg)]">Creativity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-violet-400">{creativityHours}h</p>
            <div className="mt-2 h-2 w-full rounded-full bg-[var(--muted)] overflow-hidden">
              <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${creativityPercent}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-fg)]">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-400">{activityHours}h</p>
            <div className="mt-2 h-2 w-full rounded-full bg-[var(--muted)] overflow-hidden">
              <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${activityPercent}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-fg)]">Service</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">{serviceHours}h</p>
            <div className="mt-2 h-2 w-full rounded-full bg-[var(--muted)] overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${servicePercent}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Learning Outcomes</CardTitle>
          <p className="text-sm text-[var(--muted-fg)]">
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
                    ? 'bg-green-500/10 border border-green-500/25' 
                    : 'bg-[var(--muted)]/50'
                }`}
              >
                {demonstratedOutcomes.has(outcome.number) ? (
                  <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-[var(--muted-fg)] shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm text-[var(--card-fg)]">
                    {outcome.number}. {outcome.short}
                  </p>
                  <p className="text-xs text-[var(--muted-fg)]">{outcome.full}</p>
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
              <p className="text-sm text-green-400 font-medium mb-2">
                ✓ Project identified ({projectExperiences.length} experience{projectExperiences.length !== 1 ? 's' : ''})
              </p>
              <ul className="text-sm text-[var(--muted-fg)] space-y-1">
                {projectExperiences.map(exp => (
                  <li key={exp.id}>• {exp.title}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-fg)]">
              No CAS project identified yet. Mark experiences as part of your CAS project when adding them.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
