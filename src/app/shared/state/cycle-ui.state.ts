import { signal } from '@angular/core';

export type CycleMode = 'regular' | 'menopause';
export type CycleVariability = 'low' | 'high';

export const cycleTrackingEnabled = signal(false);
export const cycleMode = signal<CycleMode>('regular');
export const cycleVariability = signal<CycleVariability>('low');
export const cycleLengthDays = signal(28);
export const cycleCurrentDay = signal(8);
