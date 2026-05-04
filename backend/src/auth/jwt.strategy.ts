import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.userService.findById(payload.sub as string);
    if (!user) {
      throw new UnauthorizedException({ message: 'Account not found.', code: 'USER_NOT_FOUND' });
    }
    if (!user.isActive) {
      throw new UnauthorizedException({ message: 'Account disabled.', code: 'USER_DISABLED' });
    }
    return { userId: user.id, email: user.email };
  }
}
