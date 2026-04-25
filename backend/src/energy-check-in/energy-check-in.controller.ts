import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnergyCheckInService } from './energy-check-in.service';
import { CreateEnergyCheckInDto, UpdateEnergyCheckInDto } from './energy-check-in.dto';

@Controller('energy-check-ins')
@UseGuards(JwtAuthGuard)
export class EnergyCheckInController {
  constructor(private readonly energyCheckInService: EnergyCheckInService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.energyCheckInService.findAllByUser(req.user.userId, startDate, endDate);
  }

  @Get('today')
  today(@Request() req) {
    const today = new Date().toISOString().split('T')[0];
    return this.energyCheckInService.findByUserAndDate(req.user.userId, today);
  }

  @Post()
  async create(
    @Request() req,
    @Body() dto: CreateEnergyCheckInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { entity, created } = await this.energyCheckInService.create(req.user.userId, dto);
    res.status(created ? 201 : 200);
    return entity;
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateEnergyCheckInDto) {
    return this.energyCheckInService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req, @Param('id') id: string) {
    return this.energyCheckInService.remove(id, req.user.userId);
  }
}
