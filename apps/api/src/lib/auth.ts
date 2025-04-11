import { Env } from "../index";
import { SignJWT, JWTPayload } from "jose";

export const JWT_SECRET_TOKEN_NAME = "auth_token";
export const JWT_SECRET_TOKEN_DURATION = 3600; // 1 hour

// Define our custom JWT payload type
export interface CustomJWTPayload extends JWTPayload {
  sub: string;
  name: string;
  email?: string;
  provider: string;
  avatarUrl?: string;
  plan: string;
  role: string;
  iat?: number;
  exp?: number;
}

export async function createJWT(
  payload: CustomJWTPayload,
  jwtSecret: string
): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);
  const expirationTime =
    Math.floor(Date.now() / 1000) + JWT_SECRET_TOKEN_DURATION;

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);

  return token;
}
