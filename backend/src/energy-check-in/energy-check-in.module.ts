import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergyCheckIn } from './energy-check-in.entity';
import { EnergyCheckInController } from './energy-check-in.controller';
import { EnergyCheckInService } from './energy-check-in.service';

@Module({
  imports: [TypeOrmModule.forFeature([EnergyCheckIn])],
  controllers: [EnergyCheckInController],
  providers: [EnergyCheckInService],
  exports: [EnergyCheckInService],
})
export class EnergyCheckInModule {}
