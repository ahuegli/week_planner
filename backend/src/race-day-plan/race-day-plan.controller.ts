import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RaceDayPlanService } from './race-day-plan.service';
import { CreateRaceDayPlanDto, UpdateRaceDayPlanDto } from './race-day-plan.dto';
import { TrainingPlanService } from '../training-plan/training-plan.service';
import { SchedulerSettingsService } from '../scheduler-settings/scheduler-settings.service';

@Controller('race-day-plans')
@UseGuards(JwtAuthGuard)
export class RaceDayPlanController {
  constructor(
    private readonly raceDayPlanService: RaceDayPlanService,
    private readonly trainingPlanService: TrainingPlanService,
    private readonly schedulerSettingsService: SchedulerSettingsService,
  ) {}

  @Get()
  findAll(@Request() req) {
    return this.raceDayPlanService.findAll(req.user.userId);
  }

  @Get('plan/:planId')
  findByPlan(@Request() req, @Param('planId') planId: string) {
    return this.raceDayPlanService.findByPlan(req.user.userId, planId);
  }

  @Post()
  @HttpCode(201)
  create(@Request() req, @Body() dto: CreateRaceDayPlanDto) {
    return this.raceDayPlanService.create(req.user.userId, dto);
  }

  @Post('generate/:planId')
  async generate(
    @Request() req,
    @Param('planId') planId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.userId;
    const plan = await this.trainingPlanService.ensurePlanOwnership(planId, userId);
    const settings = await this.schedulerSettingsService.findByUser(userId);
    const result = await this.raceDayPlanService.generateRaceDayPlan(userId, plan, settings);
    res.status(result.alreadyExisted ? 200 : 201);
    return result;
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateRaceDayPlanDto) {
    return this.raceDayPlanService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req, @Param('id') id: string) {
    return this.raceDayPlanService.remove(id, req.user.userId);
  }
}
