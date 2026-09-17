import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PASSWORD_GENERATOR } from './domain/ports/password-generator.port';
import { SUPERADMIN_PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { SUPERADMIN_REPOSITORY } from './domain/ports/superadmin-repository.port';
import { SUPERADMIN_TOKEN_ISSUER } from './domain/ports/superadmin-token-issuer.port';
import { PrismaSuperadminRepository } from './infrastructure/prisma/prisma-superadmin.repository';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { CryptoPasswordGenerator } from './infrastructure/security/crypto-password-generator';
import { JwtSuperadminTokenIssuer } from './infrastructure/security/jwt-superadmin-token-issuer';
import { SuperadminJwtStrategy } from './infrastructure/security/superadmin-jwt.strategy';
import { SuperadminAuthGuard } from './interface/guards/superadmin-auth.guard';
import { UserOrSuperadminAuthGuard } from './interface/guards/user-or-superadmin-auth.guard';

import { LoginUseCase } from './application/use-cases/auth/login.use-case';
import { ChangeOwnPasswordUseCase } from './application/use-cases/profile/change-own-password.use-case';
import { GetProfileUseCase } from './application/use-cases/profile/get-profile.use-case';
import { UpdateProfileUseCase } from './application/use-cases/profile/update-profile.use-case';
import { CreateSuperadminUseCase } from './application/use-cases/superadmins/create-superadmin.use-case';
import { DeleteSuperadminUseCase } from './application/use-cases/superadmins/delete-superadmin.use-case';
import { GetSuperadminUseCase } from './application/use-cases/superadmins/get-superadmin.use-case';
import { ListSuperadminsUseCase } from './application/use-cases/superadmins/list-superadmins.use-case';
import { SetSuperadminPasswordUseCase } from './application/use-cases/superadmins/set-superadmin-password.use-case';
import { UpdateSuperadminUseCase } from './application/use-cases/superadmins/update-superadmin.use-case';
import { SeedSuperadminUseCase } from './application/use-cases/seed/seed-superadmin.use-case';
import { SuperadminAuthController } from './interface/controllers/superadmin-auth.controller';
import { SuperadminProfileController } from './interface/controllers/superadmin-profile.controller';
import { SuperadminsController } from './interface/controllers/superadmins.controller';

@Module({
  imports: [IdentityModule],
  controllers: [
    SuperadminAuthController,
    SuperadminProfileController,
    SuperadminsController,
  ],
  providers: [
    { provide: SUPERADMIN_REPOSITORY, useClass: PrismaSuperadminRepository },
    { provide: SUPERADMIN_PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: PASSWORD_GENERATOR, useClass: CryptoPasswordGenerator },
    { provide: SUPERADMIN_TOKEN_ISSUER, useClass: JwtSuperadminTokenIssuer },
    SuperadminJwtStrategy,
    SuperadminAuthGuard,
    UserOrSuperadminAuthGuard,
    LoginUseCase,
    GetProfileUseCase,
    UpdateProfileUseCase,
    ChangeOwnPasswordUseCase,
    ListSuperadminsUseCase,
    GetSuperadminUseCase,
    CreateSuperadminUseCase,
    UpdateSuperadminUseCase,
    SetSuperadminPasswordUseCase,
    DeleteSuperadminUseCase,
    SeedSuperadminUseCase,
  ],
  exports: [SuperadminAuthGuard, UserOrSuperadminAuthGuard],
})
export class SuperadminModule {}
