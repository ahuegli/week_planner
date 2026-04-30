export type GoalMode = 'race' | 'fitness' | 'weight_loss' | null;
export type ShiftPattern = 'fixed' | 'rotating' | 'irregular';
export type CycleStatus = 'regular' | 'irregular' | 'hormonal' | 'menopause';

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: string[];
}

export interface OnboardingData {
  goal: GoalMode;
  raceEvent: string;
  raceOther: string;
  raceDate: string;
  targetTime: string;
  currentFitness: string;
  activities: string[];
  currentWeight: string;
  targetWeight: string;
  timeline: string;
  runningThresholdMinutes: number;
  runningThresholdDistance: number;
  cyclingThresholdMinutes: number;
  cyclingThresholdDistance: number;
  swimmingThresholdMinutes: number;
  swimmingThresholdDistance: number;
  trainingDays: number;
  preferredTimes: string[];
  shiftPattern: ShiftPattern;
  shifts: ShiftTemplate[];
  commuteMinutes: number;
  bedtime: string;
  wakeTime: string;
  cycleEnabled: boolean;
  cycleStatus: CycleStatus;
  lastPeriodDate: string;
  cycleLength: number;
  triathlonDistance: 'sprint' | 'olympic' | '70_3' | '140_6' | '';
  isGeneralTriTraining: boolean;
  triathlonsCompleted: number;
  endurancePedigree: 'none' | 'runner' | 'cyclist' | 'swimmer' | 'multiple';
  poolAccess: '25m' | '50m' | 'open_water' | 'pool_and_open_water' | 'none';
  hasPowerMeter: boolean;
  knowsFtp: boolean;
  ftpWatts: number | null;
  knowsLthr: boolean;
  lthrBpm: number | null;
  knowsCss: boolean;
  cssSecondsPer100m: number | null;
  knowsRunThreshold: boolean;
  runThresholdSecPerKm: number | null;
}

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  goal: null,
  raceEvent: '',
  raceOther: '',
  raceDate: '',
  targetTime: '',
  currentFitness: 'Just starting',
  activities: [],
  currentWeight: '',
  targetWeight: '',
  timeline: 'No rush - sustainable pace',
  runningThresholdMinutes: 60,
  runningThresholdDistance: 15,
  cyclingThresholdMinutes: 90,
  cyclingThresholdDistance: 40,
  swimmingThresholdMinutes: 60,
  swimmingThresholdDistance: 3,
  trainingDays: 4,
  preferredTimes: ['Flexible'],
  shiftPattern: 'fixed',
  shifts: [
    {
      id: 'shift-1',
      name: 'Work Shift',
      startTime: '08:00',
      endTime: '17:00',
      days: ['Mo', 'Tu', 'We', 'Th', 'Fr'],
    },
  ],
  commuteMinutes: 30,
  bedtime: '23:00',
  wakeTime: '07:00',
  cycleEnabled: false,
  cycleStatus: 'regular',
  lastPeriodDate: '',
  cycleLength: 28,
  triathlonDistance: '',
  isGeneralTriTraining: false,
  triathlonsCompleted: 0,
  endurancePedigree: 'none',
  poolAccess: '25m',
  hasPowerMeter: false,
  knowsFtp: false,
  ftpWatts: null,
  knowsLthr: false,
  lthrBpm: null,
  knowsCss: false,
  cssSecondsPer100m: null,
  knowsRunThreshold: false,
  runThresholdSecPerKm: null,
};
