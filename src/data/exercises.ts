import type { BodyPart, Exercise } from '../types'

/**
 * Exercise names & demo images from free-exercise-db
 * (public domain / Unlicense), based on the Everkinetic open dataset.
 * https://github.com/yuhonas/free-exercise-db
 */
const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

function img(path: string): string {
  return `${IMAGE_BASE}/${path}`
}

type SourceExercise = {
  id: string
  name: string
  bodyPart: BodyPart
  imagePath: string
}

const sourceExercises: SourceExercise[] = [
  {
    id: 'Dumbbell_Bench_Press',
    name: 'Dumbbell Bench Press',
    bodyPart: 'chest',
    imagePath: 'Dumbbell_Bench_Press/0.jpg',
  },
  {
    id: 'Dumbbell_Flyes',
    name: 'Dumbbell Flyes',
    bodyPart: 'chest',
    imagePath: 'Dumbbell_Flyes/0.jpg',
  },
  {
    id: 'Incline_Dumbbell_Press',
    name: 'Incline Dumbbell Press',
    bodyPart: 'chest',
    imagePath: 'Incline_Dumbbell_Press/0.jpg',
  },
  {
    id: 'One-Arm_Dumbbell_Row',
    name: 'One-Arm Dumbbell Row',
    bodyPart: 'back',
    imagePath: 'One-Arm_Dumbbell_Row/0.jpg',
  },
  {
    id: 'Bent_Over_Two-Dumbbell_Row',
    name: 'Bent Over Two-Dumbbell Row',
    bodyPart: 'back',
    imagePath: 'Bent_Over_Two-Dumbbell_Row/0.jpg',
  },
  {
    id: 'Stiff-Legged_Dumbbell_Deadlift',
    name: 'Stiff-Legged Dumbbell Deadlift',
    bodyPart: 'back',
    imagePath: 'Stiff-Legged_Dumbbell_Deadlift/0.jpg',
  },
  {
    id: 'Seated_Dumbbell_Press',
    name: 'Seated Dumbbell Press',
    bodyPart: 'shoulders',
    imagePath: 'Seated_Dumbbell_Press/0.jpg',
  },
  {
    id: 'Side_Lateral_Raise',
    name: 'Side Lateral Raise',
    bodyPart: 'shoulders',
    imagePath: 'Side_Lateral_Raise/0.jpg',
  },
  {
    id: 'Seated_Bent-Over_Rear_Delt_Raise',
    name: 'Seated Bent-Over Rear Delt Raise',
    bodyPart: 'shoulders',
    imagePath: 'Seated_Bent-Over_Rear_Delt_Raise/0.jpg',
  },
  {
    id: 'Dumbbell_Bicep_Curl',
    name: 'Dumbbell Bicep Curl',
    bodyPart: 'arms',
    imagePath: 'Dumbbell_Bicep_Curl/0.jpg',
  },
  {
    id: 'Alternate_Hammer_Curl',
    name: 'Alternate Hammer Curl',
    bodyPart: 'arms',
    imagePath: 'Alternate_Hammer_Curl/0.jpg',
  },
  {
    id: 'Seated_Triceps_Press',
    name: 'Seated Triceps Press',
    bodyPart: 'arms',
    imagePath: 'Seated_Triceps_Press/0.jpg',
  },
  {
    id: 'Goblet_Squat',
    name: 'Goblet Squat',
    bodyPart: 'legs',
    imagePath: 'Goblet_Squat/0.jpg',
  },
  {
    id: 'Romanian_Deadlift',
    name: 'Romanian Deadlift',
    bodyPart: 'legs',
    imagePath: 'Romanian_Deadlift/0.jpg',
  },
  {
    id: 'Dumbbell_Lunges',
    name: 'Dumbbell Lunges',
    bodyPart: 'legs',
    imagePath: 'Dumbbell_Lunges/0.jpg',
  },
  {
    id: 'Standing_Dumbbell_Calf_Raise',
    name: 'Standing Dumbbell Calf Raise',
    bodyPart: 'legs',
    imagePath: 'Standing_Dumbbell_Calf_Raise/0.jpg',
  },
  {
    id: 'Dumbbell_Side_Bend',
    name: 'Dumbbell Side Bend',
    bodyPart: 'core',
    imagePath: 'Dumbbell_Side_Bend/0.jpg',
  },
  {
    id: 'Kettlebell_Windmill',
    name: 'Kettlebell Windmill',
    bodyPart: 'core',
    imagePath: 'Kettlebell_Windmill/0.jpg',
  },
  {
    id: 'One-Arm_Kettlebell_Swings',
    name: 'One-Arm Kettlebell Swings',
    bodyPart: 'full',
    imagePath: 'One-Arm_Kettlebell_Swings/0.jpg',
  },
  {
    id: 'Kettlebell_Turkish_Get-Up_Lunge_style',
    name: 'Kettlebell Turkish Get-Up',
    bodyPart: 'full',
    imagePath: 'Kettlebell_Turkish_Get-Up_Lunge_style/0.jpg',
  },
]

export const EXERCISE_DATA_SOURCE = {
  name: 'free-exercise-db',
  url: 'https://github.com/yuhonas/free-exercise-db',
  license: 'Unlicense (public domain)',
}

export const exercises: Exercise[] = sourceExercises.map((exercise) => ({
  id: exercise.id,
  name: exercise.name,
  bodyPart: exercise.bodyPart,
  image: img(exercise.imagePath),
}))

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
