import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

<<<<<<< HEAD
  // Enable CORS for frontend
=======
>>>>>>> setup-db
  app.enableCors({
    origin: ['http://localhost:4200', 'http://localhost:4300', 'http://localhost:4301', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

<<<<<<< HEAD
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
=======
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
>>>>>>> setup-db
      transform: true,
    }),
  );

<<<<<<< HEAD
  // API prefix
=======
>>>>>>> setup-db
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}

bootstrap();
