import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';

import { MEMBERSHIP_REPOSITORY } from './domain/ports/membership-repository.port';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { REGISTRATION_REPOSITORY } from './domain/ports/registration-repository.port';
import { TOKEN_ISSUER } from './domain/ports/token-issuer.port';
import { USER_REPOSITORY } from './domain/ports/user-repository.port';

import { PrismaMembershipRepository } from './infrastructure/prisma/prisma-membership.repository';
import { PrismaRegistrationRepository } from './infrastructure/prisma/prisma-registration.repository';
import { PrismaUserRepository } from './infrastructure/prisma/prisma-user.repository';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { JwtTokenIssuer } from './infrastructure/security/jwt-token-issuer';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';

import { AuthController } from './interface/controllers/auth.controller';

@Module({
  imports: [
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
    JwtStrategy,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: MEMBERSHIP_REPOSITORY, useClass: PrismaMembershipRepository },
    {
      provide: REGISTRATION_REPOSITORY,
      useClass: PrismaRegistrationRepository,
    },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
  ],
})
export class IdentityModule {}
