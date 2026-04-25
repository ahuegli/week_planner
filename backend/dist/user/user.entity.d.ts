import { Workout } from '../workout/workout.entity';
import { CalendarEvent } from '../calendar-event/calendar-event.entity';
import { MealPrepSettings } from '../mealprep/mealprep.entity';
import { SchedulerSettings } from '../scheduler-settings/scheduler-settings.entity';
import { TrainingPlan } from '../training-plan/training-plan.entity';
import { CycleProfile } from '../cycle-profile/cycle-profile.entity';
export declare class User {
    id: string;
    email: string;
    password: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    workouts: Workout[];
    calendarEvents: CalendarEvent[];
    mealPrepSettings: MealPrepSettings;
    schedulerSettings: SchedulerSettings;
    trainingPlans: TrainingPlan[];
    cycleProfile: CycleProfile;
}
