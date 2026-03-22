import { Repository } from 'typeorm';
import { Workout } from './workout.entity';
import { CreateWorkoutDto, UpdateWorkoutDto } from './workout.dto';
export declare class WorkoutService {
    private readonly workoutRepository;
    constructor(workoutRepository: Repository<Workout>);
    findAllByUser(userId: string): Promise<Workout[]>;
    findOne(id: string, userId: string): Promise<Workout>;
    create(userId: string, dto: CreateWorkoutDto): Promise<Workout>;
    update(id: string, userId: string, dto: UpdateWorkoutDto): Promise<Workout>;
    remove(id: string, userId: string): Promise<void>;
}
