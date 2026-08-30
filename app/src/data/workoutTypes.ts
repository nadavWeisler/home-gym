import type { BodyPart } from '../types'

export type WorkoutTypeId = 'full' | 'ab' | 'ppl'

export type MuscleTarget = {
  part: Exclude<BodyPart, 'full'>
  min: number
  max: number
}

export type WorkoutDayPlan = {
  id: string
  name: string
  blurb: string
  muscles: MuscleTarget[]
}

export type WorkoutType = {
  id: WorkoutTypeId
  name: string
  description: string
  days: WorkoutDayPlan[]
}

export const workoutTypes: WorkoutType[] = [
  {
    id: 'full',
    name: 'Full body',
    description: 'One session that hits every muscle group. Keep picks tight so the day stays realistic.',
    days: [
      {
        id: 'day-full',
        name: 'Full body',
        blurb: 'A single balanced workout.',
        muscles: [
          { part: 'legs', min: 1, max: 2 },
          { part: 'back', min: 1, max: 2 },
          { part: 'chest', min: 1, max: 2 },
          { part: 'shoulders', min: 0, max: 1 },
          { part: 'arms', min: 0, max: 1 },
          { part: 'core', min: 0, max: 1 },
        ],
      },
    ],
  },
  {
    id: 'ab',
    name: 'A/B · Upper / Lower',
    description: 'Alternate an upper day and a lower day. More room on the muscles you train that session.',
    days: [
      {
        id: 'day-upper',
        name: 'Upper',
        blurb: 'Chest, back, shoulders, and arms.',
        muscles: [
          { part: 'chest', min: 1, max: 2 },
          { part: 'back', min: 1, max: 2 },
          { part: 'shoulders', min: 1, max: 2 },
          { part: 'arms', min: 1, max: 2 },
        ],
      },
      {
        id: 'day-lower',
        name: 'Lower',
        blurb: 'Legs and core.',
        muscles: [
          { part: 'legs', min: 2, max: 4 },
          { part: 'core', min: 0, max: 2 },
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Three focused days. Push and pull share arms in the catalog, so each day gets its own picks.',
    days: [
      {
        id: 'day-push',
        name: 'Push',
        blurb: 'Chest, shoulders, and arms.',
        muscles: [
          { part: 'chest', min: 1, max: 2 },
          { part: 'shoulders', min: 1, max: 2 },
          { part: 'arms', min: 1, max: 2 },
        ],
      },
      {
        id: 'day-pull',
        name: 'Pull',
        blurb: 'Back and arms.',
        muscles: [
          { part: 'back', min: 2, max: 3 },
          { part: 'arms', min: 1, max: 2 },
        ],
      },
      {
        id: 'day-legs',
        name: 'Legs',
        blurb: 'Legs and core.',
        muscles: [
          { part: 'legs', min: 2, max: 4 },
          { part: 'core', min: 0, max: 2 },
        ],
      },
    ],
  },
]

export const workoutTypeById = Object.fromEntries(
  workoutTypes.map((type) => [type.id, type]),
) as Record<WorkoutTypeId, WorkoutType>

export type MuscleSelections = Record<Exclude<BodyPart, 'full'>, string[]>

export function emptyMuscleSelections(): MuscleSelections {
  return {
    chest: [],
    back: [],
    shoulders: [],
    arms: [],
    legs: [],
    core: [],
  }
}

export function emptyProgramSelections(
  type: WorkoutType,
): Record<string, MuscleSelections> {
  return Object.fromEntries(
    type.days.map((day) => [day.id, emptyMuscleSelections()]),
  )
}

export function pickRangeLabel(target: MuscleTarget, partLabel: string): string {
  const noun = partLabel.toLowerCase()
  if (target.min === 0 && target.max === 1) return `Pick up to 1 ${noun}`
  if (target.min === 0) return `Pick up to ${target.max} ${noun}`
  if (target.min === target.max) return `Pick ${target.max} ${noun}`
  return `Pick ${target.min}–${target.max} ${noun}`
}

export function remainingLabel(selected: number, max: number): string {
  const left = Math.max(0, max - selected)
  if (left === 0) return `${selected} of ${max} selected · limit reached`
  return `${selected} of ${max} selected · ${left} remaining`
}
