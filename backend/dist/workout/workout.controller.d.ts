import { WorkoutService } from './workout.service';
import { CreateWorkoutDto, UpdateWorkoutDto } from './workout.dto';
export declare class WorkoutController {
    private readonly workoutService;
    constructor(workoutService: WorkoutService);
    findAll(req: any): Promise<import("./workout.entity").Workout[]>;
    findOne(req: any, id: string): Promise<import("./workout.entity").Workout>;
    create(req: any, dto: CreateWorkoutDto): Promise<import("./workout.entity").Workout>;
    update(req: any, id: string, dto: UpdateWorkoutDto): Promise<import("./workout.entity").Workout>;
    remove(req: any, id: string): Promise<{
        message: string;
    }>;
}
