import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-development-only-min-32-characters-long';
const secret = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  sub: string; // user id
  email: string;
  exp?: number;
}

export async function signJwt(payload: Omit<JWTPayload, 'exp'>): Promise<string> {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return jwt;
}

export async function verifyJwt(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    // Type assertion with validation
    if (payload && typeof payload === 'object' && 'sub' in payload && 'email' in payload) {
      return {
        sub: String(payload.sub),
        email: String(payload.email),
        exp: payload.exp ? Number(payload.exp) : undefined,
      } as JWTPayload;
    }
    return null;
  } catch (error) {
    return null;
  }
}
