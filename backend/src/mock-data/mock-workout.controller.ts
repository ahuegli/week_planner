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
import { AuthGuard } from '@nestjs/passport';
import { MockWorkoutService } from './mock-workout.service';

@Controller('workouts')
@UseGuards(AuthGuard('jwt'))
export class MockWorkoutController {
  constructor(private readonly workoutService: MockWorkoutService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.workoutService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.workoutService.findOne(id, req.user.userId);
  }

  @Post()
  create(@Request() req: any, @Body() dto: any) {
    return this.workoutService.create(req.user.userId, dto);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.workoutService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    this.workoutService.remove(id, req.user.userId);
    return { message: 'Workout deleted' };
  }
}
