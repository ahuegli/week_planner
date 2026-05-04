export interface CalendarEvent {
  id: string;
  title: string;
  type: 'shift' | 'workout' | 'mealprep' | 'custom-event' | 'personal' | 'oncall' | 'busy';
  day?: number;
  date?: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  durationMinutes?: number;
  commuteMinutes?: number;
  isManuallyPlaced?: boolean;
  linkedInvitationId?: string;
  acceptedInviteeEmails?: string[];
  shiftType?: 'early' | 'late' | 'night';
  workoutType?: 'swimming' | 'running' | 'biking' | 'strength' | 'yoga';
  distanceKm?: number;
  distanceCountsAsLong?: boolean;
  isPersonal?: boolean;
  isRepeatingWeekly?: boolean;
  isLocked?: boolean;
  notes?: string;
  sessionType?: string;
  intensity?: 'easy' | 'moderate' | 'hard';
  priority?: 'key' | 'supporting' | 'optional';
  duration?: number;
  distanceTarget?: number;
  status?: 'pending' | 'scheduled' | 'completed' | 'skipped' | 'moved';
  energyRating?: 'easy' | 'moderate' | 'hard';
  loggedFromOffPlan?: boolean;
  sourceWorkoutLogId?: string;
}

export const MOCK_SESSION_COACHING_NOTES: Record<string, string> = {
  tempo: 'Focus on maintaining a steady pace you could hold for 40+ minutes',
  long_run: 'Keep it conversational — you should be able to talk comfortably',
  strength: 'Focus on compound movements — squats, deadlifts, rows',
  easy_run: 'True recovery pace — slower than you think',
  yoga: 'Focus on hip openers and hamstring stretches today',
  intervals: 'Keep each hard effort consistent instead of sprinting the first rep',
  hill_reps: 'Drive your knees up and keep your effort smooth on every climb',
  biking: 'Settle into a steady cadence and avoid surging early in the ride',
};

export const MOCK_PLAN_SESSION_NOTES: Record<string, string> = {
  easy_run: 'Keep it conversational — you should be able to talk comfortably throughout',
  tempo: 'Run at a pace you could sustain for about 40 minutes — comfortably hard',
  long_run: 'Steady and easy — build endurance, not speed. Walk breaks are fine.',
  intervals: 'Short fast bursts with recovery between. Focus on form when tired.',
  hill_reps: 'Strong effort uphill, easy jog back down. Drive your knees.',
  strength: 'Focus on compound movements — squats, deadlifts, rows, presses',
  yoga: 'Focus on hip openers, hamstring stretches, and thoracic mobility',
};

export interface CyclePhaseInfo {
  enabled: boolean;
  phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
  day: number;
}

export interface WeekDay {
  label: string;
  hasWorkout: boolean;
  hasShift: boolean;
  isToday: boolean;
  isCompleted?: boolean;
}

export interface DailyTip {
  title: string;
  summary: string;
  detail: string;
}

export interface DailyReminder {
  text: string;
}

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'Morning Shift',
    type: 'shift',
    startTime: '07:00',
    endTime: '15:00',
    commuteMinutes: 30,
  },
  {
    id: '2',
    title: 'Tempo Run',
    type: 'workout',
    startTime: '16:30',
    endTime: '17:15',
    sessionType: 'tempo',
    intensity: 'hard',
    priority: 'key',
    duration: 45,
    distanceTarget: 8,
    status: 'scheduled',
  },
  {
    id: '3',
    title: 'Meal Prep',
    type: 'mealprep',
    startTime: '18:00',
    endTime: '19:30',
    duration: 90,
  },
  {
    id: '4',
    title: 'Yoga & Stretch',
    type: 'workout',
    startTime: '20:00',
    endTime: '20:30',
    sessionType: 'yoga',
    intensity: 'easy',
    priority: 'optional',
    duration: 30,
    status: 'scheduled',
  },
];

export const MOCK_CYCLE: CyclePhaseInfo = {
  enabled: true,
  phase: 'follicular',
  day: 8,
};

export const MOCK_WEEK: WeekDay[] = [
  { label: 'Mo', hasWorkout: true,  hasShift: true,  isToday: false },
  { label: 'Tu', hasWorkout: false, hasShift: true,  isToday: false },
  { label: 'We', hasWorkout: true,  hasShift: false, isToday: true  },
  { label: 'Th', hasWorkout: true,  hasShift: true,  isToday: false },
  { label: 'Fr', hasWorkout: false, hasShift: true,  isToday: false },
  { label: 'Sa', hasWorkout: true,  hasShift: false, isToday: false },
  { label: 'Su', hasWorkout: false, hasShift: false, isToday: false },
];

export const MOCK_REMINDER: DailyReminder = {
  text: 'Pack your workout gear — you have a tempo run after your shift today',
};

export const MOCK_TIP: DailyTip = {
  title: 'Peak performance window',
  summary: 'Great day for your tempo session',
  detail: 'During the follicular phase, estrogen rises and your body recovers faster. This is your strongest training window — ideal for high-intensity workouts like tempo runs and intervals.',
};

export interface DidYouKnow {
  body: string;
}

export const MOCK_DID_YOU_KNOW: DidYouKnow = {
  body: 'Strength training while in a calorie deficit signals your body to preserve muscle and burn fat instead. Even 2 sessions per week makes a significant difference.',
};

/** Mock "now" expressed as minutes since midnight — 16:00 */
export const MOCK_NOW_MINUTES = 16 * 60;

export interface DaySchedule {
  date: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  events: CalendarEvent[];
}

export const MOCK_WEEK_SCHEDULE: DaySchedule[] = [
  {
    date: '2026-04-13',
    dayLabel: 'Mon',
    dayNumber: 13,
    isToday: false,
    events: [
      { id: 'w1', title: 'Early Shift', type: 'shift', startTime: '06:00', endTime: '14:00', commuteMinutes: 30 },
      {
        id: 'w2',
        title: 'Strength Training',
        type: 'workout',
        startTime: '15:30',
        endTime: '16:30',
        sessionType: 'strength',
        intensity: 'moderate',
        priority: 'key',
        duration: 60,
        status: 'completed',
      },
    ],
  },
  {
    date: '2026-04-14',
    dayLabel: 'Tue',
    dayNumber: 14,
    isToday: false,
    events: [
      { id: 'w3', title: 'Early Shift', type: 'shift', startTime: '06:00', endTime: '14:00', commuteMinutes: 30 },
      {
        id: 'w4',
        title: 'Easy Run',
        type: 'workout',
        startTime: '15:00',
        endTime: '15:45',
        sessionType: 'easy_run',
        intensity: 'easy',
        priority: 'supporting',
        duration: 45,
        distanceTarget: 6,
        status: 'completed',
      },
    ],
  },
  {
    date: '2026-04-15',
    dayLabel: 'Wed',
    dayNumber: 15,
    isToday: false,
    events: [
      { id: 'w5', title: 'Day Off', type: 'personal', startTime: '00:00', endTime: '23:59' },
      {
        id: 'w6',
        title: 'Long Run',
        type: 'workout',
        startTime: '08:00',
        endTime: '09:30',
        sessionType: 'long_run',
        intensity: 'moderate',
        priority: 'key',
        duration: 90,
        distanceTarget: 16,
        status: 'completed',
      },
      { id: 'w7', title: 'Meal Prep', type: 'mealprep', startTime: '11:00', endTime: '12:30', duration: 90 },
    ],
  },
  {
    date: '2026-04-16',
    dayLabel: 'Thu',
    dayNumber: 16,
    isToday: false,
    events: [
      { id: 'w8', title: 'Late Shift', type: 'shift', startTime: '14:00', endTime: '22:00', commuteMinutes: 30 },
      {
        id: 'w9',
        title: 'Yoga',
        type: 'workout',
        startTime: '09:00',
        endTime: '09:30',
        sessionType: 'yoga',
        intensity: 'easy',
        priority: 'optional',
        duration: 30,
        status: 'skipped',
      },
    ],
  },
  {
    date: '2026-04-17',
    dayLabel: 'Fri',
    dayNumber: 17,
    isToday: false,
    events: [{ id: 'w10', title: 'Late Shift', type: 'shift', startTime: '14:00', endTime: '22:00', commuteMinutes: 30 }],
  },
  {
    date: '2026-04-18',
    dayLabel: 'Sat',
    dayNumber: 18,
    isToday: false,
    events: [
      {
        id: 'w11',
        title: 'Long Bike Ride',
        type: 'workout',
        startTime: '09:00',
        endTime: '11:00',
        sessionType: 'biking',
        intensity: 'hard',
        priority: 'key',
        duration: 120,
        distanceTarget: 45,
        status: 'scheduled',
      },
      { id: 'w12', title: 'Brunch with friends', type: 'personal', startTime: '12:00', endTime: '14:00' },
    ],
  },
  {
    date: '2026-04-19',
    dayLabel: 'Sun',
    dayNumber: 19,
    isToday: true,
    events: [
      { id: 'w13', title: 'Morning Shift', type: 'shift', startTime: '07:00', endTime: '15:00', commuteMinutes: 30 },
      {
        id: 'w14',
        title: 'Tempo Run',
        type: 'workout',
        startTime: '16:30',
        endTime: '17:15',
        sessionType: 'tempo',
        intensity: 'hard',
        priority: 'key',
        duration: 45,
        distanceTarget: 8,
        status: 'scheduled',
      },
      { id: 'w15', title: 'Meal Prep', type: 'mealprep', startTime: '18:00', endTime: '19:30', duration: 90 },
    ],
  },
];

export const MOCK_MONTH_EVENTS: Record<string, CalendarEvent[]> = {
  ...Object.fromEntries(MOCK_WEEK_SCHEDULE.map((day) => [day.date, day.events])),
  '2026-04-01': [
    { id: 'm1', title: 'Early Shift', type: 'shift', startTime: '06:00', endTime: '14:00', commuteMinutes: 30 },
    { id: 'm2', title: 'Workout', type: 'workout', startTime: '16:30', endTime: '17:20', duration: 50, intensity: 'moderate', priority: 'supporting', status: 'scheduled' },
  ],
  '2026-04-02': [
    { id: 'm3', title: 'Early Shift', type: 'shift', startTime: '06:00', endTime: '14:00', commuteMinutes: 30 },
  ],
  '2026-04-03': [
    { id: 'm4', title: 'Early Shift', type: 'shift', startTime: '06:00', endTime: '14:00', commuteMinutes: 30 },
    { id: 'm5', title: 'Workout', type: 'workout', startTime: '16:00', endTime: '16:45', duration: 45, intensity: 'hard', priority: 'key', status: 'scheduled' },
  ],
  '2026-04-04': [
    { id: 'm6', title: 'Workout', type: 'workout', startTime: '09:00', endTime: '09:50', duration: 50, intensity: 'moderate', priority: 'supporting', status: 'scheduled' },
  ],
  '2026-04-05': [
    { id: 'm7', title: 'Family Lunch', type: 'personal', startTime: '12:00', endTime: '14:00' },
  ],
  '2026-04-06': [
    { id: 'm8', title: 'Workout', type: 'workout', startTime: '07:30', endTime: '08:15', duration: 45, intensity: 'easy', priority: 'supporting', status: 'scheduled' },
    { id: 'm9', title: 'Meal Prep', type: 'mealprep', startTime: '18:00', endTime: '19:15', duration: 75 },
  ],
  '2026-04-07': [
    { id: 'm10', title: '1G Shift', type: 'shift', startTime: '10:00', endTime: '18:00', commuteMinutes: 25 },
  ],
  '2026-04-08': [
    { id: 'm11', title: '1G Shift', type: 'shift', startTime: '10:00', endTime: '18:00', commuteMinutes: 25 },
    { id: 'm12', title: 'Workout', type: 'workout', startTime: '19:00', endTime: '19:45', duration: 45, intensity: 'moderate', priority: 'supporting', status: 'scheduled' },
  ],
  '2026-04-09': [
    { id: 'm13', title: '1G Shift', type: 'shift', startTime: '10:00', endTime: '18:00', commuteMinutes: 25 },
    { id: 'm14', title: 'Workout', type: 'workout', startTime: '19:00', endTime: '19:50', duration: 50, intensity: 'hard', priority: 'key', status: 'scheduled' },
  ],
  '2026-04-11': [
    { id: 'm15', title: 'Workout', type: 'workout', startTime: '09:30', endTime: '10:20', duration: 50, intensity: 'moderate', priority: 'supporting', status: 'scheduled' },
    { id: 'm16', title: 'Coffee with Sam', type: 'personal', startTime: '11:30', endTime: '12:30' },
  ],
  '2026-04-12': [
    { id: 'm17', title: 'Personal Day', type: 'personal', startTime: '00:00', endTime: '23:59' },
  ],
  '2026-04-20': [
    { id: 'm18', title: 'Personal Event', type: 'personal', startTime: '18:00', endTime: '19:00' },
  ],
  '2026-04-21': [
    { id: 'm19', title: 'Workout', type: 'workout', startTime: '07:00', endTime: '07:45', duration: 45, intensity: 'moderate', priority: 'supporting', status: 'scheduled' },
  ],
  '2026-04-22': [
    { id: 'm20', title: '1G Shift', type: 'shift', startTime: '10:00', endTime: '18:00', commuteMinutes: 25 },
    { id: 'm21', title: 'Workout', type: 'workout', startTime: '18:30', endTime: '19:15', duration: 45, intensity: 'moderate', priority: 'supporting', status: 'scheduled' },
  ],
  '2026-04-23': [
    { id: 'm22', title: '1G Shift', type: 'shift', startTime: '10:00', endTime: '18:00', commuteMinutes: 25 },
    { id: 'm23', title: 'Workout', type: 'workout', startTime: '18:45', endTime: '19:30', duration: 45, intensity: 'hard', priority: 'key', status: 'scheduled' },
  ],
  '2026-04-24': [
    { id: 'm24', title: '1G Shift', type: 'shift', startTime: '10:00', endTime: '18:00', commuteMinutes: 25 },
  ],
  '2026-04-25': [
    { id: 'm25', title: 'Birthday Dinner', type: 'personal', startTime: '18:30', endTime: '21:00' },
  ],
  '2026-04-26': [
    { id: 'm26', title: 'Workout', type: 'workout', startTime: '09:00', endTime: '09:50', duration: 50, intensity: 'moderate', priority: 'supporting', status: 'scheduled' },
  ],
  '2026-04-27': [
    { id: 'm27', title: '1G Shift', type: 'shift', startTime: '10:00', endTime: '18:00', commuteMinutes: 25 },
    { id: 'm28', title: 'Workout', type: 'workout', startTime: '19:00', endTime: '19:40', duration: 40, intensity: 'moderate', priority: 'supporting', status: 'scheduled' },
  ],
  '2026-04-28': [
    { id: 'm29', title: '1G Shift', type: 'shift', startTime: '10:00', endTime: '18:00', commuteMinutes: 25 },
  ],
  '2026-04-29': [
    { id: 'm30', title: '1G Shift', type: 'shift', startTime: '10:00', endTime: '18:00', commuteMinutes: 25 },
  ],
  '2026-04-30': [
    { id: 'm31', title: 'Personal Event', type: 'personal', startTime: '17:00', endTime: '18:30' },
  ],
};

export interface MonthDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  indicators: {
    hasShift: boolean;
    hasWorkout: boolean;
    hasMealPrep: boolean;
    hasPersonal: boolean;
    isFreeDay: boolean;
  };
  shiftLabel?: string;
  workoutCount: number;
}

export const MOCK_MONTH_APRIL: MonthDay[] = [
  { date: '2026-03-30', dayNumber: 30, isCurrentMonth: false, isToday: false, indicators: { hasShift: false, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: true }, workoutCount: 0 },
  { date: '2026-03-31', dayNumber: 31, isCurrentMonth: false, isToday: false, indicators: { hasShift: false, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: true }, workoutCount: 0 },
  { date: '2026-04-01', dayNumber: 1, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: 'Early', workoutCount: 1 },
  { date: '2026-04-02', dayNumber: 2, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: 'Early', workoutCount: 0 },
  { date: '2026-04-03', dayNumber: 3, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: 'Early', workoutCount: 1 },
  { date: '2026-04-04', dayNumber: 4, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: true }, workoutCount: 1 },
  { date: '2026-04-05', dayNumber: 5, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: false, hasMealPrep: false, hasPersonal: true, isFreeDay: true }, workoutCount: 0 },
  { date: '2026-04-06', dayNumber: 6, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: true, hasMealPrep: true, hasPersonal: false, isFreeDay: true }, workoutCount: 1 },
  { date: '2026-04-07', dayNumber: 7, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: '1G', workoutCount: 0 },
  { date: '2026-04-08', dayNumber: 8, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: '1G', workoutCount: 1 },
  { date: '2026-04-09', dayNumber: 9, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: '1G', workoutCount: 1 },
  { date: '2026-04-10', dayNumber: 10, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: true }, workoutCount: 0 },
  { date: '2026-04-11', dayNumber: 11, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: true, hasMealPrep: false, hasPersonal: true, isFreeDay: true }, workoutCount: 1 },
  { date: '2026-04-12', dayNumber: 12, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: false, hasMealPrep: false, hasPersonal: true, isFreeDay: true }, workoutCount: 0 },
  { date: '2026-04-13', dayNumber: 13, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: 'Early', workoutCount: 1 },
  { date: '2026-04-14', dayNumber: 14, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: 'Early', workoutCount: 1 },
  { date: '2026-04-15', dayNumber: 15, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: true, hasMealPrep: true, hasPersonal: false, isFreeDay: true }, workoutCount: 1 },
  { date: '2026-04-16', dayNumber: 16, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: 'Late', workoutCount: 1 },
  { date: '2026-04-17', dayNumber: 17, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: 'Late', workoutCount: 0 },
  { date: '2026-04-18', dayNumber: 18, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: true, hasMealPrep: false, hasPersonal: true, isFreeDay: true }, workoutCount: 1 },
  { date: '2026-04-19', dayNumber: 19, isCurrentMonth: true, isToday: true, indicators: { hasShift: true, hasWorkout: true, hasMealPrep: true, hasPersonal: false, isFreeDay: false }, shiftLabel: 'Morning', workoutCount: 2 },
  { date: '2026-04-20', dayNumber: 20, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: false, hasMealPrep: false, hasPersonal: true, isFreeDay: true }, workoutCount: 0 },
  { date: '2026-04-21', dayNumber: 21, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: true }, workoutCount: 1 },
  { date: '2026-04-22', dayNumber: 22, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: '1G', workoutCount: 1 },
  { date: '2026-04-23', dayNumber: 23, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: '1G', workoutCount: 1 },
  { date: '2026-04-24', dayNumber: 24, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: '1G', workoutCount: 0 },
  { date: '2026-04-25', dayNumber: 25, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: false, hasMealPrep: false, hasPersonal: true, isFreeDay: true }, workoutCount: 0 },
  { date: '2026-04-26', dayNumber: 26, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: true }, workoutCount: 1 },
  { date: '2026-04-27', dayNumber: 27, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: true, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: '1G', workoutCount: 1 },
  { date: '2026-04-28', dayNumber: 28, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: '1G', workoutCount: 0 },
  { date: '2026-04-29', dayNumber: 29, isCurrentMonth: true, isToday: false, indicators: { hasShift: true, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: false }, shiftLabel: '1G', workoutCount: 0 },
  { date: '2026-04-30', dayNumber: 30, isCurrentMonth: true, isToday: false, indicators: { hasShift: false, hasWorkout: false, hasMealPrep: false, hasPersonal: true, isFreeDay: true }, workoutCount: 0 },
  { date: '2026-05-01', dayNumber: 1, isCurrentMonth: false, isToday: false, indicators: { hasShift: false, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: true }, workoutCount: 0 },
  { date: '2026-05-02', dayNumber: 2, isCurrentMonth: false, isToday: false, indicators: { hasShift: false, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: true }, workoutCount: 0 },
  { date: '2026-05-03', dayNumber: 3, isCurrentMonth: false, isToday: false, indicators: { hasShift: false, hasWorkout: false, hasMealPrep: false, hasPersonal: false, isFreeDay: true }, workoutCount: 0 },
];

export type PlanMode = 'race' | 'general_fitness' | 'weight_loss';
export type PlanPhase = 'base' | 'build' | 'peak' | 'taper' | 'maintenance';

export interface TrainingPlan {
  id: string;
  mode: PlanMode;
  sportType?: string;
  goalDate?: string;
  goalDistance?: string;
  goalTime?: string;
  totalWeeks: number;
  currentWeek: number;
  status: 'active' | 'paused' | 'completed';
  phases: PlanPhaseInfo[];
  createdAt: string;
}

export interface PlanPhaseInfo {
  name: PlanPhase;
  startWeek: number;
  endWeek: number;
}

export interface PlanWeekSummary {
  weekNumber: number;
  phase: PlanPhase;
  isDeload: boolean;
  isCurrentWeek: boolean;
  startDate: string;
  sessions: PlanSessionSummary[];
  completedSessions: number;
  totalSessions: number;
}

export interface PlanSessionSummary {
  sessionType: string;
  priority: 'key' | 'supporting' | 'optional';
  duration: number;
  intensity: 'easy' | 'moderate' | 'hard';
  distanceTarget?: number;
  status: 'pending' | 'scheduled' | 'completed' | 'skipped';
}

export const MOCK_TRAINING_PLAN: TrainingPlan = {
  id: 'plan-001',
  mode: 'race',
  sportType: 'half_marathon',
  goalDate: '2026-07-12',
  goalDistance: '21.1 km',
  goalTime: '1:45:00',
  totalWeeks: 12,
  currentWeek: 8,
  status: 'active',
  phases: [
    { name: 'base', startWeek: 1, endWeek: 4 },
    { name: 'build', startWeek: 5, endWeek: 9 },
    { name: 'peak', startWeek: 10, endWeek: 10 },
    { name: 'taper', startWeek: 11, endWeek: 12 },
  ],
  createdAt: '2026-02-15',
};

export const MOCK_PLAN_WEEKS: PlanWeekSummary[] = [
  {
    weekNumber: 1, phase: 'base', isDeload: false, isCurrentWeek: false, startDate: '2026-02-16',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 30, intensity: 'easy', distanceTarget: 5, status: 'completed' },
      { sessionType: 'easy_run', priority: 'supporting', duration: 30, intensity: 'easy', distanceTarget: 5, status: 'completed' },
      { sessionType: 'long_run', priority: 'key', duration: 60, intensity: 'easy', distanceTarget: 10, status: 'completed' },
      { sessionType: 'strength', priority: 'key', duration: 45, intensity: 'moderate', status: 'completed' },
    ],
    completedSessions: 4, totalSessions: 4,
  },
  {
    weekNumber: 2, phase: 'base', isDeload: false, isCurrentWeek: false, startDate: '2026-02-23',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 30, intensity: 'easy', distanceTarget: 5, status: 'completed' },
      { sessionType: 'easy_run', priority: 'supporting', duration: 35, intensity: 'easy', distanceTarget: 6, status: 'completed' },
      { sessionType: 'long_run', priority: 'key', duration: 65, intensity: 'easy', distanceTarget: 11, status: 'completed' },
      { sessionType: 'strength', priority: 'key', duration: 45, intensity: 'moderate', status: 'completed' },
    ],
    completedSessions: 4, totalSessions: 4,
  },
  {
    weekNumber: 3, phase: 'base', isDeload: false, isCurrentWeek: false, startDate: '2026-03-02',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 35, intensity: 'easy', distanceTarget: 6, status: 'completed' },
      { sessionType: 'easy_run', priority: 'supporting', duration: 35, intensity: 'easy', distanceTarget: 6, status: 'completed' },
      { sessionType: 'long_run', priority: 'key', duration: 70, intensity: 'easy', distanceTarget: 12, status: 'completed' },
      { sessionType: 'strength', priority: 'key', duration: 50, intensity: 'moderate', status: 'skipped' },
    ],
    completedSessions: 3, totalSessions: 4,
  },
  {
    weekNumber: 4, phase: 'base', isDeload: true, isCurrentWeek: false, startDate: '2026-03-09',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 25, intensity: 'easy', distanceTarget: 4, status: 'completed' },
      { sessionType: 'long_run', priority: 'key', duration: 50, intensity: 'easy', distanceTarget: 8, status: 'completed' },
      { sessionType: 'yoga', priority: 'optional', duration: 30, intensity: 'easy', status: 'completed' },
    ],
    completedSessions: 3, totalSessions: 3,
  },
  {
    weekNumber: 5, phase: 'build', isDeload: false, isCurrentWeek: false, startDate: '2026-03-16',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 35, intensity: 'easy', distanceTarget: 6, status: 'completed' },
      { sessionType: 'tempo', priority: 'key', duration: 40, intensity: 'hard', distanceTarget: 7, status: 'completed' },
      { sessionType: 'long_run', priority: 'key', duration: 75, intensity: 'moderate', distanceTarget: 13, status: 'completed' },
      { sessionType: 'strength', priority: 'key', duration: 50, intensity: 'moderate', status: 'completed' },
    ],
    completedSessions: 4, totalSessions: 4,
  },
  {
    weekNumber: 6, phase: 'build', isDeload: false, isCurrentWeek: false, startDate: '2026-03-23',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 35, intensity: 'easy', distanceTarget: 6, status: 'completed' },
      { sessionType: 'intervals', priority: 'key', duration: 45, intensity: 'hard', status: 'completed' },
      { sessionType: 'long_run', priority: 'key', duration: 80, intensity: 'moderate', distanceTarget: 14, status: 'completed' },
      { sessionType: 'strength', priority: 'key', duration: 50, intensity: 'moderate', status: 'skipped' },
    ],
    completedSessions: 3, totalSessions: 4,
  },
  {
    weekNumber: 7, phase: 'build', isDeload: false, isCurrentWeek: false, startDate: '2026-03-30',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 35, intensity: 'easy', distanceTarget: 6, status: 'completed' },
      { sessionType: 'tempo', priority: 'key', duration: 45, intensity: 'hard', distanceTarget: 8, status: 'completed' },
      { sessionType: 'long_run', priority: 'key', duration: 85, intensity: 'moderate', distanceTarget: 15, status: 'completed' },
      { sessionType: 'strength', priority: 'key', duration: 50, intensity: 'moderate', status: 'completed' },
      { sessionType: 'yoga', priority: 'optional', duration: 30, intensity: 'easy', status: 'completed' },
    ],
    completedSessions: 5, totalSessions: 5,
  },
  {
    weekNumber: 8, phase: 'build', isDeload: false, isCurrentWeek: true, startDate: '2026-04-13',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 35, intensity: 'easy', distanceTarget: 6, status: 'completed' },
      { sessionType: 'tempo', priority: 'key', duration: 45, intensity: 'hard', distanceTarget: 8, status: 'scheduled' },
      { sessionType: 'long_run', priority: 'key', duration: 90, intensity: 'moderate', distanceTarget: 16, status: 'completed' },
      { sessionType: 'strength', priority: 'key', duration: 50, intensity: 'moderate', status: 'scheduled' },
      { sessionType: 'yoga', priority: 'optional', duration: 30, intensity: 'easy', status: 'pending' },
    ],
    completedSessions: 2, totalSessions: 5,
  },
  {
    weekNumber: 9, phase: 'build', isDeload: true, isCurrentWeek: false, startDate: '2026-04-20',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 30, intensity: 'easy', distanceTarget: 5, status: 'pending' },
      { sessionType: 'long_run', priority: 'key', duration: 60, intensity: 'easy', distanceTarget: 10, status: 'pending' },
      { sessionType: 'yoga', priority: 'optional', duration: 30, intensity: 'easy', status: 'pending' },
    ],
    completedSessions: 0, totalSessions: 3,
  },
  {
    weekNumber: 10, phase: 'peak', isDeload: false, isCurrentWeek: false, startDate: '2026-04-27',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 35, intensity: 'easy', distanceTarget: 6, status: 'pending' },
      { sessionType: 'intervals', priority: 'key', duration: 50, intensity: 'hard', status: 'pending' },
      { sessionType: 'long_run', priority: 'key', duration: 95, intensity: 'moderate', distanceTarget: 18, status: 'pending' },
      { sessionType: 'strength', priority: 'key', duration: 50, intensity: 'moderate', status: 'pending' },
    ],
    completedSessions: 0, totalSessions: 4,
  },
  {
    weekNumber: 11, phase: 'taper', isDeload: false, isCurrentWeek: false, startDate: '2026-05-04',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 25, intensity: 'easy', distanceTarget: 4, status: 'pending' },
      { sessionType: 'tempo', priority: 'key', duration: 30, intensity: 'moderate', distanceTarget: 5, status: 'pending' },
      { sessionType: 'long_run', priority: 'key', duration: 60, intensity: 'easy', distanceTarget: 10, status: 'pending' },
    ],
    completedSessions: 0, totalSessions: 3,
  },
  {
    weekNumber: 12, phase: 'taper', isDeload: false, isCurrentWeek: false, startDate: '2026-05-11',
    sessions: [
      { sessionType: 'easy_run', priority: 'supporting', duration: 20, intensity: 'easy', distanceTarget: 3, status: 'pending' },
      { sessionType: 'easy_run', priority: 'supporting', duration: 20, intensity: 'easy', distanceTarget: 3, status: 'pending' },
    ],
    completedSessions: 0, totalSessions: 2,
  },
];
