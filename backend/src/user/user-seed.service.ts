import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';

@Injectable()
export class UserSeedService implements OnModuleInit {
  private readonly logger = new Logger(UserSeedService.name);

  constructor(private readonly userService: UserService) {}

  async onModuleInit() {
    await this.seedDemoUser();
  }

  private async seedDemoUser() {
    const demoEmail = 'demo@example.com';
    const existingUser = await this.userService.findByEmail(demoEmail);

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('demo123', 10);
      await this.userService.create(demoEmail, hashedPassword, 'Demo User');
      this.logger.log('Demo user created: demo@example.com / demo123');
    } else {
      this.logger.log('Demo user already exists');
    }
  }
}
