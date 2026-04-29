import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarShare } from './calendar-share.entity';
import { CalendarShareController } from './calendar-share.controller';
import { CalendarShareService } from './calendar-share.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarShare]), UserModule],
  controllers: [CalendarShareController],
  providers: [CalendarShareService],
  exports: [CalendarShareService],
})
export class CalendarShareModule {}
