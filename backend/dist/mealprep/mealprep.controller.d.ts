import { MealPrepService } from './mealprep.service';
import { UpdateMealPrepDto } from './mealprep.dto';
export declare class MealPrepController {
    private readonly mealPrepService;
    constructor(mealPrepService: MealPrepService);
    find(req: any): Promise<import("./mealprep.entity").MealPrepSettings>;
    update(req: any, dto: UpdateMealPrepDto): Promise<import("./mealprep.entity").MealPrepSettings>;
}
