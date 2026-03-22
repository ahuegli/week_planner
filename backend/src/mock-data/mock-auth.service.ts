import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

interface MockUser {
  id: string;
  email: string;
  password: string;
  name?: string;
}

@Injectable()
export class MockAuthService {
  private users: MockUser[] = [];
  private initialized = false;

  constructor(private readonly jwtService: JwtService) {}

  private async ensureInitialized() {
    if (!this.initialized) {
      const hashedPassword = await bcrypt.hash('demo123', 10);
      this.users = [
        {
          id: 'demo-user-id',
          email: 'demo@example.com',
          password: hashedPassword,
          name: 'Demo User',
        },
      ];
      this.initialized = true;
    }
  }

  async register(dto: { email: string; password: string; name?: string }) {
    await this.ensureInitialized();
    const existingUser = this.users.find((u) => u.email === dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user: MockUser = {
      id: uuidv4(),
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
    };
    this.users.push(user);

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async login(dto: { email: string; password: string }) {
    await this.ensureInitialized();
    const user = this.users.find((u) => u.email === dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  findById(userId: string): MockUser | undefined {
    return this.users.find((u) => u.id === userId);
  }
}
