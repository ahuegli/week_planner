export interface WorkoutStep {
  step: string;
  duration: string;
  description: string;
}

function inferType(sessionType: string): string {
  const s = sessionType.toLowerCase().replace(/[\s-]/g, '_');
  if (s.includes('tempo')) return 'tempo';
  if (s.includes('interval')) return 'intervals';
  if (s.includes('hill')) return 'hill';
  if (s.includes('long_run') || s === 'long') return 'long_run';
  if (s.includes('strength')) return 'strength';
  if (s.includes('yoga') || s.includes('mobility')) return 'mobility';
  if (s.includes('swim')) return 'swim';
  if (s.includes('ride') || s.includes('bike') || s.includes('cycling')) return 'ride';
  return 'easy_run';
}

export function getWorkoutStructure(
  sessionType: string,
  duration: number,
  intensity: 'easy' | 'moderate' | 'hard',
  paceTarget?: string | null,
): WorkoutStep[] {
  const type = inferType(sessionType);

  switch (type) {
    case 'tempo': {
      const warmup = 10;
      const cooldown = 5;
      const mainSet = Math.max(10, duration - warmup - cooldown);
      const paceDesc = paceTarget ? `Tempo pace (${paceTarget})` : 'Tempo pace — comfortably hard';
      return [
        { step: 'Warm-up', duration: `${warmup} min`, description: 'Easy pace' },
        { step: 'Main set', duration: `${mainSet} min`, description: paceDesc },
        { step: 'Cool-down', duration: `${cooldown} min`, description: 'Easy pace' },
      ];
    }

    case 'intervals': {
      const warmup = 10;
      const cooldown = 10;
      const workTime = Math.max(0, duration - warmup - cooldown);
      const repCount = Math.max(3, Math.min(6, Math.round(workTime / 5)));
      const paceDesc = paceTarget ? `Fast (${paceTarget})` : 'Fast — 8/10 effort';
      const steps: WorkoutStep[] = [
        { step: 'Warm-up', duration: `${warmup} min`, description: 'Easy pace' },
      ];
      for (let i = 1; i <= repCount; i++) {
        steps.push({ step: `Interval ${i}`, duration: '3 min', description: paceDesc });
        if (i < repCount) {
          steps.push({ step: 'Recovery', duration: '2 min', description: 'Easy jog' });
        }
      }
      steps.push({ step: 'Cool-down', duration: `${cooldown} min`, description: 'Easy pace' });
      return steps;
    }

    case 'hill': {
      return [
        { step: 'Warm-up', duration: '10 min', description: 'Easy pace' },
        { step: 'Hill rep 1', duration: '90 sec', description: 'Hard uphill effort' },
        { step: 'Recovery', duration: '2 min', description: 'Jog back down' },
        { step: 'Hill rep 2', duration: '90 sec', description: 'Hard uphill effort' },
        { step: 'Recovery', duration: '2 min', description: 'Jog back down' },
        { step: 'Hill rep 3', duration: '90 sec', description: 'Hard uphill effort' },
        { step: 'Recovery', duration: '2 min', description: 'Jog back down' },
        { step: 'Hill rep 4', duration: '90 sec', description: 'Hard uphill effort' },
        { step: 'Cool-down', duration: '10 min', description: 'Easy pace' },
      ];
    }

    case 'long_run': {
      const half = Math.floor(duration / 2);
      return [
        { step: 'First half', duration: `${half} min`, description: 'Easy, conversational pace' },
        { step: 'Second half', duration: `${duration - half} min`, description: 'Comfortable steady rhythm' },
      ];
    }

    case 'strength': {
      return [
        { step: 'Warm-up', duration: '5 min', description: 'Light cardio + dynamic stretches' },
        { step: 'Squats', duration: '3×10', description: 'Moderate weight' },
        { step: 'Deadlifts', duration: '3×8', description: 'Moderate weight' },
        { step: 'Rows', duration: '3×10', description: 'Moderate weight' },
        { step: 'Overhead Press', duration: '3×10', description: 'Moderate weight' },
        { step: 'Cool-down', duration: '5 min', description: 'Static stretches' },
      ];
    }

    case 'mobility': {
      const seg = Math.max(3, Math.floor(duration / 5));
      return [
        { step: 'Hip openers', duration: `${seg} min`, description: '' },
        { step: 'Hamstring stretches', duration: `${seg} min`, description: '' },
        { step: 'Thoracic spine', duration: `${seg} min`, description: '' },
        { step: 'Calf/ankle work', duration: `${seg} min`, description: '' },
        { step: 'Savasana', duration: `${seg} min`, description: '' },
      ];
    }

    case 'swim': {
      const warmup = Math.min(10, Math.floor(duration * 0.2));
      const cooldown = Math.min(5, Math.floor(duration * 0.1));
      const main = duration - warmup - cooldown;
      return [
        { step: 'Warm-up', duration: `${warmup} min`, description: 'Easy technique focus' },
        { step: 'Main set', duration: `${main} min`, description: intensity === 'easy' ? 'Steady aerobic effort' : 'Sustained moderate effort' },
        { step: 'Cool-down', duration: `${cooldown} min`, description: 'Easy backstroke or drill' },
      ];
    }

    case 'ride': {
      const warmup = Math.min(15, Math.floor(duration * 0.2));
      const cooldown = Math.min(10, Math.floor(duration * 0.15));
      const main = duration - warmup - cooldown;
      return [
        { step: 'Warm-up', duration: `${warmup} min`, description: 'Easy spin, 80–90 rpm' },
        { step: 'Main set', duration: `${main} min`, description: intensity === 'easy' ? 'Zone 2 effort' : 'Steady tempo effort' },
        { step: 'Cool-down', duration: `${cooldown} min`, description: 'Easy spin' },
      ];
    }

    default: {
      const desc = intensity === 'easy'
        ? 'Easy, conversational pace'
        : intensity === 'hard'
        ? 'Sustained moderate-hard effort'
        : 'Comfortable, steady pace';
      return [
        { step: 'Run', duration: `${duration} min`, description: desc },
      ];
    }
  }
}
