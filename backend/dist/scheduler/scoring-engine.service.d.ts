export declare function addMinutes(time: string, minutes: number): string;
export declare function eventIntervals(event: any): {
    day: number;
    start: string;
    end: string;
}[];
export declare function timeToMinutes(time: string): number;
export declare class ScoringEngineService {
    scoreSlot(event: any, shifts: any[], settings: any, weekContext: any): number;
    getWorkoutValue(workout: any, settings: any): number;
}
