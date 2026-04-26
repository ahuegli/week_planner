import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkoutLogService } from './workout-log.service';
import { CreateWorkoutLogDto, UpdateWorkoutLogDto } from './workout-log.dto';

@Controller('workout-logs')
@UseGuards(JwtAuthGuard)
export class WorkoutLogController {
  constructor(private readonly workoutLogService: WorkoutLogService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateWorkoutLogDto) {
    return this.workoutLogService.create(req.user.userId, dto);
  }

  @Get()
  async findAll(@Request() req) {
    return this.workoutLogService.findAllByUser(req.user.userId);
  }

  // /session/:id must be declared before /:id to avoid route shadowing
  @Get('session/:sessionId')
  async findBySession(@Request() req, @Param('sessionId') sessionId: string) {
    return this.workoutLogService.findByPlannedSession(sessionId, req.user.userId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.workoutLogService.findOne(id, req.user.userId);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateWorkoutLogDto) {
    return this.workoutLogService.update(id, req.user.userId, dto);
  }
}
