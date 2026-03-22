export declare class WorkoutDto {
    id: string;
    name: string;
    workoutType: string;
    duration: number;
    frequencyPerWeek: number;
    distanceKm?: number;
}
export declare class MealPrepDto {
    duration: number;
    sessionsPerWeek: number;
    daysPreppedFor?: number;
}
export declare class CalendarEventDto {
    id: string;
    title: string;
    type: string;
    day: number;
    startTime: string;
    endTime: string;
    durationMinutes?: number;
    shiftType?: string;
    isLocked?: boolean;
    isPersonal?: boolean;
}
export declare class SchedulerSettingsDto {
    beforeShiftBufferMinutes?: number;
    afterShiftBufferMinutes?: number;
    enduranceWorkoutMinDuration?: number;
    enduranceWeight?: number;
    strengthWeight?: number;
    yogaWeight?: number;
}
export declare class WeekContextDto {
    personalEvents?: CalendarEventDto[];
}
export declare class GenerateScheduleDto {
    existingEvents: CalendarEventDto[];
    workouts: WorkoutDto[];
    mealPrep: MealPrepDto;
    settings?: SchedulerSettingsDto;
    weekContext?: WeekContextDto;
}
export declare class ValidateConstraintsDto {
    existingEvents: CalendarEventDto[];
    workouts: WorkoutDto[];
    mealPrep: MealPrepDto;
    settings?: SchedulerSettingsDto;
    weekContext?: WeekContextDto;
}
