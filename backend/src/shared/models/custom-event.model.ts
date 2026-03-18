export interface CustomEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
  isRepeatingWeekly: boolean;
  commuteMinutes?: number;
}
