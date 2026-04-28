type Discipline = 'swim' | 'bike' | 'run' | 'brick';

function deriveDiscipline(sessionType: string | undefined): Discipline | null {
  if (!sessionType) return null;
  if (sessionType.startsWith('swim')) return 'swim';
  if (sessionType.startsWith('bike')) return 'bike';
  if (
    sessionType === 'run_quality' ||
    sessionType === 'run_easy' ||
    sessionType === 'run_long' ||
    sessionType.startsWith('run_')
  )
    return 'run';
  if (sessionType === 'brick') return 'brick';
  return null;
}

// Swim:  #2a6ea8 — bright water blue, distinct from steel-blue --color-workout
// Bike:  #5c8a4a — forest green, distinct from mealprep olive #6B7F5E
// Run:   #d4782a — warm orange, distinct from oncall amber #C4923A
// Brick: #7c5fa8 — purple (reserved for WP12B, not yet generated)
const DISCIPLINE_BORDER: Record<Discipline, string> = {
  swim: '#2a6ea8',
  bike: '#5c8a4a',
  run: '#d4782a',
  brick: '#7c5fa8',
};

const DISCIPLINE_BG: Record<Discipline, string> = {
  swim: 'rgba(42, 110, 168, 0.15)',
  bike: 'rgba(92, 138, 74, 0.15)',
  run: 'rgba(212, 120, 42, 0.15)',
  brick: 'rgba(124, 95, 168, 0.15)',
};

export function workoutDisciplineBorderColor(sessionType: string | undefined): string {
  const d = deriveDiscipline(sessionType);
  return d ? DISCIPLINE_BORDER[d] : 'var(--color-workout)';
}

export function workoutDisciplineBgColor(sessionType: string | undefined): string {
  const d = deriveDiscipline(sessionType);
  return d ? DISCIPLINE_BG[d] : 'rgba(45, 77, 122, 0.15)';
}
