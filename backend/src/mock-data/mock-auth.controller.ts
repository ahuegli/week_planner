import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { MockAuthService } from './mock-auth.service';

@Controller('auth')
export class MockAuthController {
  constructor(private readonly authService: MockAuthService) {}

  @Post('register')
  async register(@Body() dto: { email: string; password: string; name?: string }) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: { email: string; password: string }) {
    return this.authService.login(dto);
  }
}
