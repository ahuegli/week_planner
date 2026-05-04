export function roundToFriendlyDuration(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 0;
  }

  if (minutes < 15) {
    const rounded = Math.round(minutes / 5) * 5;
    return Math.max(10, Math.min(15, rounded));
  }

  if (minutes <= 120) {
    return Math.round(minutes / 15) * 15;
  }

  if (minutes <= 180) {
    return Math.round(minutes / 30) * 30;
  }

  return Math.round(minutes / 30) * 30;
}