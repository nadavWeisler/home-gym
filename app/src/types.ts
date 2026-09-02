export type BodyPart =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'full'

export type WorkoutMode = 'edit' | 'perform'

export type Exercise = {
  id: string
  name: string
  bodyPart: BodyPart
  image: string
  images: string[]
  equipment: string
  instructions: string[]
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
  done?: boolean
}

export type ExerciseLog = {
  exerciseId: string
  sets: SetLog[]
  done?: boolean
}

export type WorkoutSession = {
  id: string
  programId: string
  dayId: string
  date: string
  exercises: ExerciseLog[]
  notes?: string
}

export type ActiveWorkout = {
  programId: string
  dayId: string
  mode: WorkoutMode
  session: WorkoutSession
}
