import { SportStats, StatsSummary, StreakStats } from '../../../core/models/app-data.models';

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconPath: string;
  earned: boolean;
  progress?: string;
}

const STAR =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
const SHIELD =
  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z';
const FLAME =
  'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z';
const DIAMOND =
  'M2.7 7.3l4.3-5.1 9.3 0 4.3 5.1L12 21.9z';
const MEDAL =
  'M12 15a6 6 0 100-12 6 6 0 000 12zm-3.5 1.5L7 21l5-2 5 2-1.5-4.5';
const TROPHY =
  'M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z';
const CROWN =
  'M2 4l3 12h14l3-12-6 7-4-7-4 7z';
const SUN =
  'M12 17A5 5 0 1012 7a5 5 0 000 10zm0-15v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42';
const MOON =
  'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z';
const CLOCK =
  'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-13v4l3 2';
const LOTUS =
  'M12 22c0 0-8-5-8-12a8 8 0 0116 0c0 7-8 12-8 12z';

function check(
  summary: StatsSummary,
  streaks: StreakStats,
  sports: SportStats[],
): Record<string, { earned: boolean; progress?: string }> {
  const totalKm = summary.totalDistanceKm;
  const longestRun = sports.find(s => s.sportType === 'running')?.longestSessionKm ?? 0;
  const longestMin = sports.reduce((max, s) => Math.max(max, s.longestSessionMinutes ?? 0), 0);

  return {
    first_workout: {
      earned: summary.totalWorkoutsCompleted >= 1,
      progress: `${summary.totalWorkoutsCompleted}/1 workouts`,
    },
    week_warrior: {
      earned:
        summary.thisWeek.total > 0 &&
        summary.thisWeek.completed >= summary.thisWeek.total,
      progress: `${summary.thisWeek.completed}/${summary.thisWeek.total} this week`,
    },
    streak_starter: {
      earned: streaks.bestWeekStreak >= 2,
      progress: `${Math.min(streaks.bestWeekStreak, 2)}/2 week streak`,
    },
    iron_will: {
      earned: streaks.bestWeekStreak >= 4,
      progress: `${Math.min(streaks.bestWeekStreak, 4)}/4 week streak`,
    },
    century_club: {
      earned: totalKm >= 100,
      progress: `${Math.round(totalKm)}/100 km`,
    },
    marathon_ready: {
      earned: longestRun >= 30,
      progress: `${Math.round(longestRun * 10) / 10}/30 km longest run`,
    },
    consistency_king: {
      earned: summary.completionRate >= 80 && summary.totalWorkoutsCompleted >= 10,
      progress: `${summary.completionRate}% completion rate`,
    },
    early_bird: {
      earned: summary.earlyBirdCount >= 10,
      progress: `${summary.earlyBirdCount}/10 early workouts`,
    },
    night_owl: {
      earned: summary.nightOwlCount >= 10,
      progress: `${summary.nightOwlCount}/10 evening workouts`,
    },
    long_haul: {
      earned: longestMin >= 120,
      progress: `${longestMin}/120 min longest session`,
    },
    key_streak: {
      earned: streaks.bestKeySessionStreak >= 5,
      progress: `${Math.min(streaks.bestKeySessionStreak, 5)}/5 key sessions in a row`,
    },
    recovery_pro: {
      earned: summary.optCompleted >= 4,
      progress: `${summary.optCompleted}/4 recovery sessions completed`,
    },
  };
}

const DEFINITIONS: Array<Omit<Badge, 'earned' | 'progress'>> = [
  { id: 'first_workout', name: 'First Step', description: 'Complete your first workout', iconPath: STAR },
  { id: 'week_warrior', name: 'Week Warrior', description: 'Complete all sessions in a week', iconPath: SHIELD },
  { id: 'streak_starter', name: 'Streak Starter', description: '2-week key session streak', iconPath: FLAME },
  { id: 'iron_will', name: 'Iron Will', description: '4-week key session streak', iconPath: DIAMOND },
  { id: 'century_club', name: 'Century Club', description: '100 km total distance', iconPath: MEDAL },
  { id: 'marathon_ready', name: 'Marathon Ready', description: 'Longest run ≥ 30 km', iconPath: TROPHY },
  { id: 'consistency_king', name: 'Consistency', description: '80%+ completion, 10+ workouts', iconPath: CROWN },
  { id: 'early_bird', name: 'Early Bird', description: '10 workouts before 8 AM', iconPath: SUN },
  { id: 'night_owl', name: 'Night Owl', description: '10 workouts after 8 PM', iconPath: MOON },
  { id: 'long_haul', name: 'Long Haul', description: 'Single session over 2 hours', iconPath: CLOCK },
  { id: 'key_streak', name: 'Key Machine', description: '5 key sessions in a row', iconPath: FLAME },
  { id: 'recovery_pro', name: 'Recovery Pro', description: '4 recovery sessions completed', iconPath: LOTUS },
];

export function calculateBadges(
  summary: StatsSummary | null,
  streaks: StreakStats | null,
  sports: SportStats[],
): Badge[] {
  if (!summary || !streaks) {
    return DEFINITIONS.map(d => ({ ...d, earned: false }));
  }

  const results = check(summary, streaks, sports);
  return DEFINITIONS.map(d => ({
    ...d,
    earned: results[d.id]?.earned ?? false,
    progress: results[d.id]?.progress,
  }));
}
