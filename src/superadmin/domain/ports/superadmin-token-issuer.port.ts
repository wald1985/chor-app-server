export interface SuperadminTokenPayload {
  sub: string;
  email: string;
  tokenVersion: number;
}

export interface SuperadminTokenIssuer {
  issue(payload: SuperadminTokenPayload): string;
}

export const SUPERADMIN_TOKEN_ISSUER = Symbol('SUPERADMIN_TOKEN_ISSUER');
