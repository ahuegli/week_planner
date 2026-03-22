export declare class ConstraintCheckerService {
    validateAll(events: any[], shifts: any[], settings: any, weekContext: any): string[];
    eventsOverlap(event1: any, event2: any): boolean;
    violatesShiftBuffer(event: any, shift: any, settings: any): boolean;
    isSlotAvailable(day: number, startTime: string, endTime: string, occupied: {
        day: number;
        start: string;
        end: string;
    }[]): boolean;
}
