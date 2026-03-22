import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkoutService } from './workout.service';
import { CreateWorkoutDto, UpdateWorkoutDto } from './workout.dto';

@Controller('workouts')
@UseGuards(JwtAuthGuard)
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Get()
  async findAll(@Request() req) {
    return this.workoutService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.workoutService.findOne(id, req.user.userId);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateWorkoutDto) {
    return this.workoutService.create(req.user.userId, dto);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateWorkoutDto) {
    return this.workoutService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.workoutService.remove(id, req.user.userId);
    return { message: 'Workout deleted' };
  }
}
