export type BodyPart =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'full'

export type Exercise = {
  id: string
  name: string
  bodyPart: BodyPart
  image: string
}

export type ProgramDay = {
  id: string
  name: string
  exerciseIds: string[]
}

export type Program = {
  id: string
  name: string
  description: string
  days: ProgramDay[]
}

export type SetLog = {
  id: string
  reps: number
  weight: number
}

export type ExerciseLog = {
  exerciseId: string
  sets: SetLog[]
}

export type WorkoutSession = {
  id: string
  programId: string
  dayId: string
  date: string
  exercises: ExerciseLog[]
  notes?: string
}
