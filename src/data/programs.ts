import type { Program } from '../types'

export const programs: Program[] = [
  {
    id: 'ab-split',
    name: 'A / B Split',
    description:
      'Alternate upper and lower free-weight days. Great for 4 sessions a week at home.',
    days: [
      {
        id: 'day-a',
        name: 'Day A — Upper',
        exerciseIds: [
          'Dumbbell_Bench_Press',
          'One-Arm_Dumbbell_Row',
          'Seated_Dumbbell_Press',
          'Dumbbell_Flyes',
          'Side_Lateral_Raise',
          'Dumbbell_Bicep_Curl',
          'Seated_Triceps_Press',
        ],
      },
      {
        id: 'day-b',
        name: 'Day B — Lower',
        exerciseIds: [
          'Goblet_Squat',
          'Romanian_Deadlift',
          'Dumbbell_Lunges',
          'Standing_Dumbbell_Calf_Raise',
          'One-Arm_Kettlebell_Swings',
          'Dumbbell_Side_Bend',
          'Stiff-Legged_Dumbbell_Deadlift',
        ],
      },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    description:
      'One free-weight session covering push, pull, legs, and core. Ideal 2–3× / week.',
    days: [
      {
        id: 'full-1',
        name: 'Full Body Session',
        exerciseIds: [
          'Goblet_Squat',
          'Dumbbell_Bench_Press',
          'Bent_Over_Two-Dumbbell_Row',
          'Romanian_Deadlift',
          'Seated_Dumbbell_Press',
          'Alternate_Hammer_Curl',
          'Kettlebell_Windmill',
        ],
      },
    ],
  },
]

export const programById = Object.fromEntries(
  programs.map((program) => [program.id, program]),
) as Record<string, Program>
