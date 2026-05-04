import { StatsSummary, TaskCategory } from '../../../core/models/app-data.models';
import { Badge } from './badge-calculator';

const STAR =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
const BOLT =
  'M13 2L3 14h9l-1 8 10-12h-9l1-8z';
const SHIELD =
  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z';
const MAP_PIN =
  'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z';
const FLAME =
  'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z';
const DIAMOND =
  'M2.7 7.3l4.3-5.1 9.3 0 4.3 5.1L12 21.9z';
const CROWN =
  'M2 4l3 12h14l3-12-6 7-4-7-4 7z';
const TROPHY =
  'M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z';

const ALL_NON_OTHER_CATEGORIES: TaskCategory[] = [
  'quick_admin', 'long_admin', 'errand', 'deep_work', 'personal',
];

function check(summary: StatsSummary): Record<string, { earned: boolean; progress?: string }> {
  const total = summary.tasksCompletedTotal ?? 0;
  const streak = summary.taskStreakDays ?? 0;
  const cats = summary.tasksByCategory ?? {};
  const quickAdmin = cats['quick_admin'] ?? 0;
  const deepWork = cats['deep_work'] ?? 0;
  const errands = cats['errand'] ?? 0;
  const polymathCount = ALL_NON_OTHER_CATEGORIES.filter(c => (cats[c] ?? 0) >= 1).length;

  return {
    first_task: {
      earned: total >= 1,
      progress: `${Math.min(total, 1)}/1 tasks completed`,
    },
    quick_wins: {
      earned: quickAdmin >= 10,
      progress: `${quickAdmin}/10 quick tasks`,
    },
    deep_diver: {
      earned: deepWork >= 5,
      progress: `${deepWork}/5 deep work sessions`,
    },
    errand_runner: {
      earned: errands >= 10,
      progress: `${errands}/10 errands`,
    },
    streak_builder: {
      earned: streak >= 7,
      progress: `${Math.min(streak, 7)}/7 day streak`,
    },
    streak_champion: {
      earned: streak >= 30,
      progress: `${Math.min(streak, 30)}/30 day streak`,
    },
    polymath: {
      earned: polymathCount >= 5,
      progress: `${polymathCount}/5 categories unlocked`,
    },
    centurion: {
      earned: total >= 100,
      progress: `${total}/100 tasks`,
    },
  };
}

const TASK_DEFINITIONS: Array<Omit<Badge, 'earned' | 'progress'>> = [
  { id: 'first_task',      name: 'First Step',       description: 'Complete your first task',                  iconPath: STAR   },
  { id: 'quick_wins',      name: 'Quick Wins',        description: '10 quick admin tasks done',                 iconPath: BOLT   },
  { id: 'deep_diver',      name: 'Deep Diver',        description: '5 deep work sessions completed',            iconPath: SHIELD },
  { id: 'errand_runner',   name: 'Errand Runner',     description: '10 errands completed',                      iconPath: MAP_PIN},
  { id: 'streak_builder',  name: 'Streak Builder',    description: '7-day task completion streak',              iconPath: FLAME  },
  { id: 'streak_champion', name: 'Streak Champion',   description: '30-day task completion streak',             iconPath: DIAMOND},
  { id: 'polymath',        name: 'Polymath',          description: 'Complete tasks in all 5 categories',        iconPath: CROWN  },
  { id: 'centurion',       name: 'Centurion',         description: '100 tasks completed',                       iconPath: TROPHY },
];

export function calculateTaskBadges(summary: StatsSummary | null): Badge[] {
  if (!summary) {
    return TASK_DEFINITIONS.map(d => ({ ...d, earned: false }));
  }
  const results = check(summary);
  return TASK_DEFINITIONS.map(d => ({
    ...d,
    earned: results[d.id]?.earned ?? false,
    progress: results[d.id]?.progress,
  }));
}
