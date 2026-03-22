import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealPrepSettings } from './mealprep.entity';
import { MealPrepService } from './mealprep.service';
import { MealPrepController } from './mealprep.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MealPrepSettings])],
  controllers: [MealPrepController],
  providers: [MealPrepService],
  exports: [MealPrepService],
})
export class MealPrepModule {}
