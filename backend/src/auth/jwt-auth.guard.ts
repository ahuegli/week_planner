import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // passport-jwt routes JWT verification errors (expired, malformed) through `info`, not `err`.
  // Errors from validate() (user-not-found, user-disabled) come through `err`.
  handleRequest(err: any, user: any, info: any): any {
    if (info?.name === 'TokenExpiredError' || err?.name === 'TokenExpiredError') {
      throw new UnauthorizedException({
        message: 'Session expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
      });
    }
    if (err) {
      // Re-throw tagged exceptions from validate() (USER_NOT_FOUND, USER_DISABLED, INVALID_TOKEN)
      throw err;
    }
    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid session.',
        code: 'INVALID_TOKEN',
      });
    }
    return user;
  }
}
