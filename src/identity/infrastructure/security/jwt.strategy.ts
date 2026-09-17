import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthTokenPayload } from '../../domain/ports/token-issuer.port';
import { USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import type { UserRepository } from '../../domain/ports/user-repository.port';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Duplicated as a literal here (instead of importing from `src/superadmin`)
 * because Identity must not depend on Superadmin (ADR 0008). See ADR 0011
 * and `src/superadmin/domain/superadmin-token-audience.ts`.
 */
const SUPERADMIN_TOKEN_AUDIENCE = 'chor-app-superadmin';

function hasSuperadminAudience(aud: unknown): boolean {
  if (typeof aud === 'string') {
    return aud === SUPERADMIN_TOKEN_AUDIENCE;
  }
  return Array.isArray(aud) && aud.includes(SUPERADMIN_TOKEN_AUDIENCE);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Returns `null` (rather than throwing) on any verification failure: a
  // thrown error makes Passport treat this strategy as *errored*, which
  // aborts UserOrSuperadminAuthGuard's `AuthGuard(['jwt', 'superadmin-jwt'])`
  // before it can try the other strategy. Returning a falsy value makes
  // Passport treat it as a *failed* strategy and fall through instead.
  async validate(
    payload: AuthTokenPayload & { aud?: unknown },
  ): Promise<AuthenticatedUser | null> {
    if (hasSuperadminAudience(payload.aud)) {
      return null;
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      return null;
    }

    if (payload.tokenVersion !== user.tokenVersion) {
      return null;
    }

    return { id: user.id, email: user.email, name: user.name };
  }
}
