import catalog from './free-exercise-db.json'
import type { BodyPart, Exercise } from '../types'

/**
 * Full catalog from free-exercise-db (public domain / Unlicense),
 * based on the Everkinetic open dataset.
 * https://github.com/yuhonas/free-exercise-db
 */
const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

type CatalogExercise = {
  id: string
  name: string
  equipment: string
  primaryMuscles: string[]
  images: string[]
  instructions: string[]
}

const MUSCLE_TO_PART: Record<string, BodyPart> = {
  chest: 'chest',
  lats: 'back',
  'middle back': 'back',
  'lower back': 'back',
  traps: 'back',
  shoulders: 'shoulders',
  neck: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  abdominals: 'core',
  quadriceps: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  abductors: 'legs',
  adductors: 'legs',
}

function img(path: string): string {
  return `${IMAGE_BASE}/${path}`
}

function toBodyPart(muscles: string[]): BodyPart {
  const primary = muscles[0]
  if (!primary) return 'full'
  return MUSCLE_TO_PART[primary] ?? 'full'
}

export const EXERCISE_DATA_SOURCE = {
  name: 'free-exercise-db',
  url: 'https://github.com/yuhonas/free-exercise-db',
  license: 'Unlicense (public domain)',
}

export const exercises: Exercise[] = (catalog as CatalogExercise[]).map(
  (exercise) => {
    const images = exercise.images.map(img)
    return {
      id: exercise.id,
      name: exercise.name,
      bodyPart: toBodyPart(exercise.primaryMuscles),
      image: images[0] ?? '',
      images,
      equipment: exercise.equipment,
      instructions: exercise.instructions,
    }
  },
)

export const exerciseById = Object.fromEntries(
  exercises.map((exercise) => [exercise.id, exercise]),
) as Record<string, Exercise>

export const bodyPartLabel: Record<Exercise['bodyPart'], string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  full: 'Full body',
}

export const buildableBodyParts: Exclude<BodyPart, 'full'>[] = [
  'legs',
  'back',
  'chest',
  'shoulders',
  'arms',
  'core',
]

export const equipmentOptions = [
  ...new Set(exercises.map((exercise) => exercise.equipment)),
].sort((a, b) => a.localeCompare(b))

export function formatEquipment(value: string): string {
  if (value === 'none') return 'No equipment'
  if (value === 'e-z curl bar') return 'EZ curl bar'
  if (value === 'body only') return 'Bodyweight'
  if (value === 'kettlebells') return 'Kettlebell'
  if (value === 'exercise ball') return 'Exercise ball'
  if (value === 'foam roll') return 'Foam roll'
  if (value === 'medicine ball') return 'Medicine ball'
  return value.charAt(0).toUpperCase() + value.slice(1)
}
