export type CalendarEventType = 'shift' | 'workout' | 'mealprep' | 'custom-event' | 'personal' | 'oncall' | 'busy';
export type ShiftType = 'early' | 'late' | 'night';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  day: number;
  date?: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  shiftType?: ShiftType;
  workoutType?: Workout['workoutType'];
  distanceKm?: number;
  distanceCountsAsLong?: boolean;
  isLocked?: boolean;
  isPersonal?: boolean;
  notes?: string;
  isRepeatingWeekly?: boolean;
  commuteMinutes?: number;
  isManuallyPlaced?: boolean;
  linkedInvitationId?: string;
  linkedNextSessionId?: string | null;
  linkedPriorSessionId?: string | null;
  acceptedInviteeEmails?: string[];
  status?: 'pending' | 'scheduled' | 'completed' | 'skipped' | 'moved';
  intensity?: 'easy' | 'moderate' | 'hard';
  priority?: 'key' | 'supporting' | 'optional';
  duration?: number;
  distanceTarget?: number;
  sessionType?: string;
  discipline?: string | null;
  energyRating?: 'easy' | 'moderate' | 'hard';
}

export interface Workout {
  id: string;
  name: string;
  workoutType: 'swimming' | 'running' | 'biking' | 'strength' | 'yoga';
  duration: number;
  frequencyPerWeek: number;
  priority?: 'key' | 'supporting' | 'optional';
  distanceKm?: number;
  distanceCountsAsLong?: boolean;
}

export interface SchedulerSettings {
  id: string;
  userId: string;
  beforeShiftBufferMinutes: number;
  afterShiftBufferMinutes: number;
  enduranceWorkoutMinDuration: number;
  enduranceWeight: number;
  strengthWeight: number;
  yogaWeight: number;
  cycleTrackingEnabled: boolean;
  autoPlaceEarliestTime?: string;
  autoPlaceLatestTime?: string;
  preferredWorkoutTimes?: string[] | null;
  maxTrainingDaysPerWeek?: number;
  ftpWatts?: number | null;
  lthrBpm?: number | null;
  cssSecondsPer100m?: number | null;
  poolAccess?: '25m' | '50m' | 'open_water' | 'pool_and_open_water' | 'none' | null;
  hasPowerMeter?: boolean;
  triathlonsCompleted?: number | null;
  endurancePedigree?: 'none' | 'runner' | 'cyclist' | 'swimmer' | 'multiple' | null;
  periodisationOverride?: 'traditional' | 'reverse' | null;
}

export interface MealprepSettings {
  id: string;
  userId: string;
  duration: number;
  sessionsPerWeek: number;
  minDaysBetweenSessions?: number;
}

export interface WeekDay {
  label: string;
  date?: string;
  hasWorkout: boolean;
  hasShift: boolean;
  isToday: boolean;
  isSelected?: boolean;
  isCompleted?: boolean;
}

export type CycleMode = 'natural' | 'hormonal_contraception' | 'perimenopause' | 'manual';
export type CycleVariability = 'low' | 'medium' | 'high';

export interface CycleProfile {
  id: string;
  userId: string;
  mode: CycleMode;
  lastPeriodStart: string | null;
  recentCycleLengths: number[];
  averageCycleLength: number;
  variability: CycleVariability;
  currentPhaseOverride: string | null;
}

export interface CycleCurrentPhase {
  phase: string;
  day: number;
  cycleLengthDays: number;
  mode?: string;
}

export interface CycleCurrentPhaseApiResponse {
  phase: string;
  cycleDay: number | null;
  averageCycleLength: number;
  mode: string;
}

export interface DaySchedule {
  date: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  events: CalendarEvent[];
}

export type PlanMode = 'race' | 'general_fitness' | 'weight_loss';
export type PlanStatus = 'active' | 'paused' | 'completed';
export type PlanPhase = 'base' | 'build' | 'peak' | 'taper' | 'maintenance';
export type PlannedSessionPriority = 'key' | 'supporting' | 'optional';
export type PlannedSessionIntensity = 'easy' | 'moderate' | 'hard';
export type PlannedSessionStatus = 'pending' | 'scheduled' | 'completed' | 'skipped' | 'moved';

export interface PlanWeek {
  id: string;
  userId: string;
  planId: string;
  weekNumber: number;
  phase: PlanPhase;
  isDeload: boolean;
  volumeTarget: number | null;
  startDate: string;
  endDate: string;
}

export interface PlannedSession {
  id: string;
  userId: string;
  planWeekId: string;
  sessionType: string;
  purpose: string;
  priority: PlannedSessionPriority;
  duration: number;
  intensity: PlannedSessionIntensity;
  distanceTarget: number | null;
  paceTarget: string | null;
  skippable: boolean;
  shortenable: boolean;
  minimumDuration: number | null;
  substituteOptions: string[] | null;
  missImpact: 'high' | 'medium' | 'low';
  cyclePhaseRules: Record<string, unknown> | null;
  status: PlannedSessionStatus;
  completedAt: string | null;
  energyRating: PlannedSessionIntensity | null;
  linkedCalendarEventId: string | null;
  notes: string | null;
  isCarryForward: boolean;
  originalWeekNumber: number | null;
  discipline?: 'swim' | 'bike' | 'run' | 'brick' | 'strength' | 'mobility' | 'rest' | null;
  prescriptionData?: Record<string, unknown> | null;
}

export interface SessionCarryForwardResult {
  created: boolean;
  targetWeek?: number;
  targetDay?: string;
  reason: string;
}

export interface SkipSessionResponse {
  skippedSession: PlannedSession;
  carryForward: SessionCarryForwardResult | null;
}

export interface PlanWeekWithSessions extends PlanWeek {
  sessions?: PlannedSession[];
}

export interface PlanPhaseInfo {
  name: PlanPhase;
  startWeek: number;
  endWeek: number;
}

export interface PlanSessionSummary {
  id?: string;
  sessionType: string;
  priority: PlannedSessionPriority;
  duration: number;
  intensity: PlannedSessionIntensity;
  distanceTarget?: number;
  status: PlannedSessionStatus;
  isCarryForward?: boolean;
  originalWeekNumber?: number | null;
  linkedCalendarEventId?: string | null;
  scheduledDateLabel?: string;
  carryForwardLabel?: string;
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

export interface TrainingPlan {
  id: string;
  userId: string;
  mode: PlanMode;
  sportType?: string | null;
  triathlonDistance?: 'sprint' | 'olympic' | '70_3' | '140_6' | null;
  goalDate?: string | null;
  goalDistance?: string | null;
  goalTime?: string | null;
  totalWeeks: number;
  currentWeek: number;
  status: PlanStatus;
  createdAt: string;
  updatedAt?: string;
  phases?: PlanPhaseInfo[];
  weeks?: PlanWeekWithSessions[];
}

export interface ScheduleEntirePlanResult {
  scheduledWeeks: number;
  totalEventsPlaced: number;
  unplacedSessions: Array<{
    weekNumber: number;
    sessionName: string;
    reason: string;
  }>;
}

export type IHaveTimeSuggestionKind = 'pending' | 'tomorrow' | 'mealprep' | 'recovery' | 'no-plan' | 'none';

export interface IHaveTimeSuggestion {
  kind: IHaveTimeSuggestionKind;
  message: string;
  ctaLabel: string | null;
  sessionType?: string;
  duration?: number;
  intensity?: PlannedSessionIntensity;
  description?: string;
  plannedSessionId?: string;
  eventId?: string;
}

export interface RescheduleConflictsResult {
  conflictsFound: number;
  weeksRescheduled: number;
  workoutsRescheduled: number;
  affectedWeeks: number[];
}

export interface SchedulerGenerateResponse {
  placedEvents: Array<Partial<CalendarEvent> & { day: number }>;
  unplacedWorkouts: unknown[];
  totalScore?: number;
  placedWorkoutCount?: number;
  placedLongWorkoutCount?: number;
  weightedWorkoutScore?: number;
}

export interface WeeklyProgress {
  id: string;
  userId: string;
  planId: string;
  weekNumber: number;
  plannedKeySessions: number;
  completedKeySessions: number;
  plannedSupportingSessions: number;
  completedSupportingSessions: number;
  volumeTarget: number | null;
  volumeActual: number | null;
  streakKeySessionsHit: number;
  streakKeySessionsMissed: number;
}

export interface PlanCreatePayload {
  mode: PlanMode;
  sportType?: string;
  triathlonDistance?: 'sprint' | 'olympic' | '70_3' | '140_6';
  goalDate?: string;
  goalDistance?: string;
  goalTime?: string;
  totalWeeks?: number;
  currentWeek?: number;
  status?: PlanStatus;
}

export type PlanUpdatePayload = Partial<PlanCreatePayload>;

export interface Note {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  dueDate: string | null;
  dueTime: string | null;
  isScheduled: boolean;
  estimatedDurationMinutes: number | null;
  wantsScheduling: boolean;
  linkedCalendarEventId: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotePayload {
  title: string;
  body?: string;
  dueDate?: string;
  dueTime?: string;
  estimatedDurationMinutes?: number;
  wantsScheduling?: boolean;
}

export type UpdateNotePayload = Partial<CreateNotePayload> & {
  completed?: boolean;
  linkedCalendarEventId?: string | null;
};

export interface SlotCandidate {
  date: string; // YYYY-MM-DD
  day: number; // 0-6 (offset from week start)
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  score: number;
  label: string; // e.g. "Tuesday 14:00"
}

export type EnergyRating = 'easy' | 'moderate' | 'hard';

export interface WorkoutLog {
  id: string;
  userId: string;
  plannedSessionId?: string;
  calendarEventId?: string;
  sessionType: string;
  sportType?: string;
  energyRating: EnergyRating;
  plannedDuration: number;
  actualDuration?: number;
  actualDistance?: number;
  averagePace?: string;
  averageSpeed?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;
  elevationGain?: number;
  notes?: string;
  endedEarly: boolean;
  endedEarlyReason?: string;
  completedAt: string;
}

export interface CreateWorkoutLogPayload {
  plannedSessionId?: string;
  calendarEventId?: string;
  sessionType: string;
  sportType?: string;
  energyRating: EnergyRating;
  plannedDuration: number;
  actualDuration?: number;
  actualDistance?: number;
  averagePace?: string;
  averageSpeed?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;
  elevationGain?: number;
  notes?: string;
  endedEarly?: boolean;
  endedEarlyReason?: string;
  completedAt?: string;
}

export type UpdateWorkoutLogPayload = Partial<Omit<CreateWorkoutLogPayload, 'plannedSessionId' | 'calendarEventId' | 'sessionType' | 'sportType' | 'plannedDuration'>>;

// ── Conflict resolution ───────────────────────────────────────────────────

export interface ConflictSuggestion {
  action: 'shift_time' | 'move_day' | 'cannot_resolve';
  suggestedDay?: number;
  suggestedDate?: string;
  suggestedStartTime?: string;
  suggestedEndTime?: string;
  reason: string;
}

export interface DetectedConflict {
  eventId: string;
  title: string;
  day: number;
  date: string;
  startTime: string;
  endTime: string;
  priority: string;
  isManuallyPlaced: boolean;
  suggestion: ConflictSuggestion;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: DetectedConflict[];
}

export interface ConflictMove {
  eventId: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
}

// ── Stats ──────────────────────────────────────────────────────────────────

export interface StatsSummary {
  totalWorkoutsCompleted: number;
  totalDurationMinutes: number;
  totalDistanceKm: number;
  totalCalories: number;
  averageEnergyRating: 'easy' | 'moderate' | 'hard';
  completionRate: number;
  keyCompletionRate: number;
  supportingCompletionRate: number;
  optionalCompletionRate: number;
  keyCompleted: number;
  keyTotal: number;
  supportCompleted: number;
  supportTotal: number;
  optCompleted: number;
  optTotal: number;
  currentPlan: {
    mode: string;
    sportType: string;
    weekNumber: number;
    totalWeeks: number;
    phase: string;
  } | null;
  thisWeek: {
    completed: number;
    total: number;
    keySessionsHit: number;
    keySessionsTotal: number;
  };
  activeSince: string | null;
  earlyBirdCount: number;
  nightOwlCount: number;
}

export interface WeeklyStatsWeek {
  weekStart: string;
  weekNumber: number;
  phase: string | null;
  completed: number;
  total: number;
  skipped: number;
  totalDurationMinutes: number;
  totalDistanceKm: number;
  keySessionsHit: number;
  keySessionsTotal: number;
  averageEnergyRating: string | null;
}

export interface WeeklyStats {
  weeks: WeeklyStatsWeek[];
}

export interface StreakStats {
  currentWeekStreak: number;
  bestWeekStreak: number;
  currentDayStreak: number;
  bestDayStreak: number;
  currentKeySessionStreak: number;
  bestKeySessionStreak: number;
  lastWorkoutDate: string | null;
}

export interface SportStatsWeek {
  weekStart: string;
  distanceKm: number;
  durationMinutes: number;
  sessionsCount: number;
  averagePace: string | null;
}

export interface SportStats {
  sportType: string;
  totalSessions: number;
  totalDurationMinutes: number;
  totalDistanceKm: number;
  averagePaceMinPerKm: string | null;
  averageSpeedKmh: number | null;
  bestPace: string | null;
  longestSessionKm: number | null;
  longestSessionMinutes: number | null;
  weeklyTrend: SportStatsWeek[];
}

export type EnergyLevel = 'low' | 'normal' | 'high';

export interface EnergyCheckIn {
  id: string;
  userId: string;
  date: string;
  level: EnergyLevel;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnergyCheckInPayload {
  date: string;
  level: EnergyLevel;
  source: string;
}

// ── Calendar Sharing ──────────────────────────────────────────────────────

export interface CalendarShare {
  id: string;
  ownerId: string;
  ownerEmail: string;
  recipientId: string;
  recipientEmail: string;
  shareLevel: 'full' | 'busy_only' | 'workouts_only';
  active: boolean;
  createdAt: string;
}

export interface CreateCalendarSharePayload {
  recipientEmail: string;
  shareLevel?: string;
}

export interface UpdateCalendarSharePayload {
  shareLevel?: string;
  active?: boolean;
}

export type UpdateEnergyCheckInPayload = Partial<CreateEnergyCheckInPayload>;

export interface SymptomLog {
  id: string;
  userId: string;
  date: string;
  symptoms: string[];
  otherSymptom: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSymptomLogPayload {
  date: string;
  symptoms: string[];
  otherSymptom?: string | null;
}

export type UpdateSymptomLogPayload = Partial<CreateSymptomLogPayload>;

// ── Event Invitations ──────────────────────────────────────────────────────

export interface EventInvitation {
  id: string;
  inviterId: string;
  recipientId: string;
  calendarEventId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  inviterEmail: string;
  recipientEmail: string;
  eventTitle: string;
  eventDate: string;
  eventStartTime: string;
}

export interface CreateEventInvitationPayload {
  calendarEventId: string;
  recipientEmail: string;
}

export interface RespondToInvitationPayload {
  response: 'accepted' | 'declined';
}
