import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { NotificationsModule } from '../notifications/notifications.module';

import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';

import { MEMBERSHIP_REPOSITORY } from './domain/ports/membership-repository.port';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from './domain/ports/password-reset-token-repository.port';
import { REGISTRATION_REPOSITORY } from './domain/ports/registration-repository.port';
import { RESET_TOKEN_GENERATOR } from './domain/ports/reset-token-generator.port';
import { TOKEN_ISSUER } from './domain/ports/token-issuer.port';
import { USER_REPOSITORY } from './domain/ports/user-repository.port';

import { PrismaMembershipRepository } from './infrastructure/prisma/prisma-membership.repository';
import { PrismaPasswordResetTokenRepository } from './infrastructure/prisma/prisma-password-reset-token.repository';
import { PrismaRegistrationRepository } from './infrastructure/prisma/prisma-registration.repository';
import { PrismaUserRepository } from './infrastructure/prisma/prisma-user.repository';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { CryptoResetTokenGenerator } from './infrastructure/security/crypto-reset-token-generator';
import { JwtTokenIssuer } from './infrastructure/security/jwt-token-issuer';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';

import { AuthController } from './interface/controllers/auth.controller';

@Module({
  imports: [
    NotificationsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_EXPIRES_IN',
            '1d',
          ) as NonNullable<JwtModuleOptions['signOptions']>['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    GetCurrentUserUseCase,
    ChangePasswordUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    JwtStrategy,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: MEMBERSHIP_REPOSITORY, useClass: PrismaMembershipRepository },
    {
      provide: REGISTRATION_REPOSITORY,
      useClass: PrismaRegistrationRepository,
    },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: PrismaPasswordResetTokenRepository,
    },
    { provide: RESET_TOKEN_GENERATOR, useClass: CryptoResetTokenGenerator },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
  ],
})
export class IdentityModule {}
