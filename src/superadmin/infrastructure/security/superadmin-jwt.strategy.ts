import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SUPERADMIN_TOKEN_AUDIENCE } from '../../domain/superadmin-token-audience';
import type { SuperadminTokenPayload } from '../../domain/ports/superadmin-token-issuer.port';
import { SUPERADMIN_REPOSITORY } from '../../domain/ports/superadmin-repository.port';
import type { SuperadminRepository } from '../../domain/ports/superadmin-repository.port';

export interface SuperadminPrincipal {
  kind: 'superadmin';
  id: string;
  email: string;
  name: string;
}

@Injectable()
export class SuperadminJwtStrategy extends PassportStrategy(
  Strategy,
  'superadmin-jwt',
) {
  constructor(
    configService: ConfigService,
    @Inject(SUPERADMIN_REPOSITORY)
    private readonly superadminRepository: SuperadminRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      audience: SUPERADMIN_TOKEN_AUDIENCE,
    });
  }

  // See the comment on JwtStrategy.validate: returning `null` (rather than
  // throwing) lets UserOrSuperadminAuthGuard fall through to the other
  // strategy instead of aborting with a hard Passport error.
  async validate(
    payload: SuperadminTokenPayload,
  ): Promise<SuperadminPrincipal | null> {
    const superadmin = await this.superadminRepository.findById(payload.sub);
    if (!superadmin) {
      return null;
    }

    if (payload.tokenVersion !== superadmin.tokenVersion) {
      return null;
    }

    return {
      kind: 'superadmin',
      id: superadmin.id,
      email: superadmin.email,
      name: superadmin.name,
    };
  }
}
