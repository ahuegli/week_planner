import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MockMealPrepService } from './mock-mealprep.service';

@Controller('mealprep-settings')
@UseGuards(AuthGuard('jwt'))
export class MockMealPrepController {
  constructor(private readonly mealPrepService: MockMealPrepService) {}

  @Get()
  find(@Request() req: any) {
    return this.mealPrepService.findByUser(req.user.userId);
  }

  @Put()
  update(@Request() req: any, @Body() dto: any) {
    return this.mealPrepService.update(req.user.userId, dto);
  }
}
