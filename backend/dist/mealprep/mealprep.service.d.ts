import { Repository } from 'typeorm';
import { MealPrepSettings } from './mealprep.entity';
import { UpdateMealPrepDto } from './mealprep.dto';
export declare class MealPrepService {
    private readonly mealPrepRepository;
    constructor(mealPrepRepository: Repository<MealPrepSettings>);
    findByUser(userId: string): Promise<MealPrepSettings>;
    create(userId: string): Promise<MealPrepSettings>;
    update(userId: string, dto: UpdateMealPrepDto): Promise<MealPrepSettings>;
}
