import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MealPrepService } from './mealprep.service';
import { UpdateMealPrepDto } from './mealprep.dto';

@Controller('mealprep-settings')
@UseGuards(JwtAuthGuard)
export class MealPrepController {
  constructor(private readonly mealPrepService: MealPrepService) {}

  @Get()
  async find(@Request() req) {
    return this.mealPrepService.findByUser(req.user.userId);
  }

  @Put()
  async update(@Request() req, @Body() dto: UpdateMealPrepDto) {
    return this.mealPrepService.update(req.user.userId, dto);
  }
}
