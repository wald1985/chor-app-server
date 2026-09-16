import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { EMAIL_SENDER } from '../../src/notifications/domain/ports/email-sender.port';

export interface TestAppResult {
  app: INestApplication;
  moduleFixture: TestingModule;
  fakeEmailSender: {
    send: jest.Mock;
  };
}

export async function createTestApp(): Promise<TestAppResult> {
  const fakeEmailSender = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EMAIL_SENDER)
    .useValue(fakeEmailSender)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cookieParser());

  await app.init();

  return {
    app,
    moduleFixture,
    fakeEmailSender,
  };
}
