import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const useDatabase = process.env.USE_DATABASE !== 'false';
  if (useDatabase && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  console.log(`Running in ${useDatabase ? 'DATABASE' : 'MOCK'} mode`);

  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://localhost:4300',
      'http://localhost:4301',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}

bootstrap();
