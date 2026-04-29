export type PhaseName = 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown';

export interface PhaseBoundaries {
  menstrual: { start: number; end: number };
  follicular: { start: number; end: number };
  ovulation: { start: number; end: number };
  luteal: { start: number; end: number };
}

/** Used by cycle.page.ts for the phase ring — exact extraction, no behavior change. */
export function calculatePhaseBoundaries(length: number): PhaseBoundaries {
  const safeLength = Math.min(40, Math.max(21, length));
  const lutealStart = safeLength - 13;
  const ovulationStart = safeLength - 16;
  const ovulationEnd = safeLength - 14;
  const menstrualEnd = Math.min(5, ovulationStart - 1);
  const follicularStart = menstrualEnd + 1;
  const follicularEnd = Math.max(follicularStart, ovulationStart - 1);

  return {
    menstrual: { start: 1, end: menstrualEnd },
    follicular: { start: follicularStart, end: follicularEnd },
    ovulation: { start: ovulationStart, end: ovulationEnd },
    luteal: { start: lutealStart, end: safeLength },
  };
}

/**
 * Returns a map of YYYY-MM-DD → phase name for the 7 days starting at weekStartDate.
 * Math matches backend/src/cycle-profile/cycle-profile.service.ts computePhasesForWeek exactly.
 * Dates use local time to match the frontend's toDateString convention.
 */
export function calculatePhasesForWeek(
  profile: { lastPeriodStart: string | null; averageCycleLength: number },
  weekStartDate: string,
): Map<string, PhaseName> {
  const map = new Map<string, PhaseName>();
  if (!profile.lastPeriodStart) return map;

  const weekStart = new Date(`${weekStartDate}T00:00:00`);
  const periodStart = new Date(`${profile.lastPeriodStart}T00:00:00`);
  const cycleLength = Math.max(21, profile.averageCycleLength || 28);
  const lutealStart = cycleLength - 13;
  const ovulationStart = Math.max(6, lutealStart - 3);

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const diffDays = Math.floor((date.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) continue;

    const cycleDay = (diffDays % cycleLength) + 1;

    let phase: PhaseName;
    if (cycleDay <= 5) phase = 'menstrual';
    else if (cycleDay >= lutealStart) phase = 'luteal';
    else if (cycleDay >= ovulationStart && cycleDay < lutealStart) phase = 'ovulation';
    else phase = 'follicular';

    map.set(dateStr, phase);
  }

  return map;
}
