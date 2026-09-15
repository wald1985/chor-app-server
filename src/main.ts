import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const PORT = process.env.PORT || 3000;
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: 'http://localhost:3000', // 👈 Разрешаем frontend-у обращаться к API
    credentials: true, // 👈 Разрешаем передавать куки
  });
  app.use(cookieParser());

  await app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

void bootstrap();
