/**
 * JWT `aud` claim identifying a superadmin session token, as opposed to a
 * regular user token. See ADR 0011. Duplicated as a literal string in
 * `src/identity/infrastructure/security/jwt.strategy.ts` because Identity
 * must not import from Superadmin (ADR 0008).
 */
export const SUPERADMIN_TOKEN_AUDIENCE = 'chor-app-superadmin';
