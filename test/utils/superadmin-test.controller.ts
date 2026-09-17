import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { IdentityModule } from '../../src/identity/identity.module';
import { JwtAuthGuard } from '../../src/identity/interface/guards/jwt-auth.guard';
import { SuperadminModule } from '../../src/superadmin';
import { CurrentSuperadmin } from '../../src/superadmin/interface/decorators/current-superadmin.decorator';
import { SuperadminAuthGuard } from '../../src/superadmin/interface/guards/superadmin-auth.guard';
import { UserOrSuperadminAuthGuard } from '../../src/superadmin/interface/guards/user-or-superadmin-auth.guard';
import type { SuperadminPrincipal } from '../../src/superadmin/infrastructure/security/superadmin-jwt.strategy';

@Controller('test-superadmin')
@UseGuards(SuperadminAuthGuard)
export class TestSuperadminController {
  @Get()
  check(@CurrentSuperadmin() principal: SuperadminPrincipal) {
    return { status: 'ok', principal };
  }
}

@Controller('test-any')
@UseGuards(UserOrSuperadminAuthGuard)
export class TestAnyController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}

@Controller('test-jwt-only')
@UseGuards(JwtAuthGuard)
export class TestJwtOnlyController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [IdentityModule, SuperadminModule],
  controllers: [
    TestSuperadminController,
    TestAnyController,
    TestJwtOnlyController,
  ],
})
export class SuperadminTestModule {}
