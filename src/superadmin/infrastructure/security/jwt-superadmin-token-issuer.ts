import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SUPERADMIN_TOKEN_AUDIENCE } from '../../domain/superadmin-token-audience';
import {
  SuperadminTokenIssuer,
  SuperadminTokenPayload,
} from '../../domain/ports/superadmin-token-issuer.port';

@Injectable()
export class JwtSuperadminTokenIssuer implements SuperadminTokenIssuer {
  constructor(private readonly jwtService: JwtService) {}

  issue(payload: SuperadminTokenPayload): string {
    return this.jwtService.sign(payload, {
      audience: SUPERADMIN_TOKEN_AUDIENCE,
    });
  }
}
