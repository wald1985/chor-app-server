import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { EMAIL_SENDER } from '../../src/notifications';

export interface TestAppResult {
  app: INestApplication;
  moduleFixture: TestingModule;
  fakeEmailSender: {
    send: jest.Mock;
  };
}

import { TestingModuleBuilder } from '@nestjs/testing';

export async function createTestApp(
  customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<TestAppResult> {
  const fakeEmailSender = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  let builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EMAIL_SENDER)
    .useValue(fakeEmailSender);

  if (customize) {
    builder = customize(builder);
  }

  const moduleFixture: TestingModule = await builder.compile();

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
