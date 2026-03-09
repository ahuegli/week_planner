export type ShiftType = 'early' | 'late' | 'night';

export interface Shift {
  type: ShiftType;
  start: string;
  end: string;
}

export const SHIFT_DEFINITIONS: Record<ShiftType, Shift> = {
  early: {
    type: 'early',
    start: '06:00',
    end: '14:00',
  },
  late: {
    type: 'late',
    start: '14:00',
    end: '22:00',
  },
  night: {
    type: 'night',
    start: '22:00',
    end: '06:00',
  },
};
