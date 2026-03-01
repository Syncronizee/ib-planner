import type { Assessment } from '@/lib/types'

type AssessmentAverageOptions = {
  requireCompleted?: boolean
}

export function getAssessmentAveragePercentage(
  assessments: Assessment[],
  options: AssessmentAverageOptions = {}
): number | null {
  const { requireCompleted = true } = options
  const eligibleAssessments = assessments.filter((assessment) => {
    if (assessment.percentage === null) {
      return false
    }

    if (requireCompleted && !assessment.is_completed) {
      return false
    }

    return true
  })

  if (eligibleAssessments.length === 0) {
    return null
  }

  const weightedAssessments = eligibleAssessments.filter(
    (assessment) => typeof assessment.weight === 'number' && assessment.weight > 0
  )

  if (weightedAssessments.length > 0) {
    const totalWeight = weightedAssessments.reduce(
      (sum, assessment) => sum + (assessment.weight || 0),
      0
    )

    if (totalWeight <= 0) {
      return null
    }

    const weightedTotal = weightedAssessments.reduce(
      (sum, assessment) => sum + (assessment.percentage || 0) * (assessment.weight || 0),
      0
    )

    return Math.round((weightedTotal / totalWeight) * 100) / 100
  }

  const totalPercentage = eligibleAssessments.reduce(
    (sum, assessment) => sum + (assessment.percentage || 0),
    0
  )

  return Math.round((totalPercentage / eligibleAssessments.length) * 100) / 100
}

export function formatAssessmentPercentage(value: number | null): string {
  if (value === null) {
    return '-'
  }

  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`
}
