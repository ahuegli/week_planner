import { ArgumentsHost, Catch, ExceptionFilter, UnauthorizedException } from '@nestjs/common';

@Catch(UnauthorizedException)
export class JwtAuthExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const body = exception.getResponse() as Record<string, unknown>;

    if ('code' in body) {
      // Tagged JWT/auth exception from JwtAuthGuard or JwtStrategy
      response.status(401).json({
        statusCode: 401,
        message: body.message as string,
        code: body.code as string,
      });
    } else {
      // Non-JWT UnauthorizedException (e.g., login with wrong credentials) — preserve body as-is
      response.status(401).json(body);
    }
  }
}
