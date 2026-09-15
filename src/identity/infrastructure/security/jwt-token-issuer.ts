import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AuthTokenPayload,
  TokenIssuer,
} from '../../domain/ports/token-issuer.port';

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(private readonly jwtService: JwtService) {}

  issue(payload: AuthTokenPayload): string {
    return this.jwtService.sign(payload);
  }
}
