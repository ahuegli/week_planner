import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SymptomLogService } from './symptom-log.service';
import { CreateSymptomLogDto, UpdateSymptomLogDto } from './symptom-log.dto';

@Controller('symptom-logs')
@UseGuards(JwtAuthGuard)
export class SymptomLogController {
  constructor(private readonly symptomLogService: SymptomLogService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.symptomLogService.findAllByUser(req.user.userId, startDate, endDate);
  }

  @Get('today')
  today(@Request() req) {
    const today = new Date().toISOString().split('T')[0];
    return this.symptomLogService.findByUserAndDate(req.user.userId, today);
  }

  @Post()
  async create(
    @Request() req,
    @Body() dto: CreateSymptomLogDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { entity, created } = await this.symptomLogService.create(req.user.userId, dto);
    res.status(created ? 201 : 200);
    return entity;
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSymptomLogDto) {
    return this.symptomLogService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req, @Param('id') id: string) {
    return this.symptomLogService.remove(id, req.user.userId);
  }
}
