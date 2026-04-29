import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrainingPlanService } from './training-plan.service';
import { CreateTrainingPlanDto, UpdateTrainingPlanDto } from './training-plan.dto';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class TrainingPlanController {
  constructor(private readonly planService: TrainingPlanService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateTrainingPlanDto) {
    return this.planService.create(req.user.userId, dto);
  }

  @Get()
  async findAll(@Request() req) {
    return this.planService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.planService.findOneByUser(id, req.user.userId);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateTrainingPlanDto) {
    return this.planService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.planService.remove(id, req.user.userId);
    return { message: 'Training plan deleted' };
  }

  @Get(':id/weeks')
  async getWeeks(@Request() req, @Param('id') id: string) {
    return this.planService.getPlanWeeks(id, req.user.userId);
  }

  @Get(':id/weeks/:weekNum')
  async getWeek(
    @Request() req,
    @Param('id') id: string,
    @Param('weekNum', ParseIntPipe) weekNum: number,
  ) {
    return this.planService.getPlanWeek(id, weekNum, req.user.userId);
  }

  @Post(':id/generate')
  async generate(@Request() req, @Param('id') id: string) {
    return this.planService.generatePlanTemplate(id, req.user.userId);
  }
}
