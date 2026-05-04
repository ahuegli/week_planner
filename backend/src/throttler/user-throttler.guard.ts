import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { verify as jwtVerify } from 'jsonwebtoken';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  // APP_GUARD runs before @UseGuards(JwtAuthGuard), so req.user is not yet populated.
  // Verify the JWT signature before trusting the sub claim for rate-limit keying.
  // Unverified decode was exploitable: an attacker could forge sub=<victim-userId>
  // to exhaust the victim's AI hourly quota.
  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (req.user?.userId) return req.user.userId as string;

    const secret = process.env.JWT_SECRET;
    const auth = req.headers?.authorization as string | undefined;
    if (secret && auth?.startsWith('Bearer ')) {
      try {
        const token = auth.split(' ')[1];
        const payload = jwtVerify(token, secret) as { sub?: string };
        if (payload?.sub) return payload.sub;
      } catch {
        // invalid/expired token — fall through to IP
      }
    }

    return req.ip as string;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const res = context.switchToHttp().getResponse();
    const retryAfterSeconds = Math.max(1, Math.ceil(throttlerLimitDetail.timeToBlockExpire));
    res.header('Retry-After', retryAfterSeconds);
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
