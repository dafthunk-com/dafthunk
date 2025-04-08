import { SignJWT, jwtVerify } from "jose";
import { Env } from "../../src/lib/server/api/env";

// Define the JWT payload structure
export interface JWTPayload {
  sub: string; // Subject (user ID - UUID)
  name: string; // User's name
  email?: string; // User's email (optional)
  provider: string; // OAuth provider used for this login session
  avatarUrl?: string; // Added optional avatar URL
  plan: string; // User's subscription plan
  role: string; // User's role
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
}

// Create and sign a JWT
export async function createJWT(
  payload: Omit<JWTPayload, "iat" | "exp">,
  env: Env
): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  // Explicitly construct the payload for signing, ensuring optional fields are handled
  const jwtPayload: Partial<JWTPayload> = {
    sub: payload.sub,
    name: payload.name,
    provider: payload.provider,
    plan: payload.plan,
    role: payload.role,
    ...(payload.email && { email: payload.email }),
    ...(payload.avatarUrl && { avatarUrl: payload.avatarUrl }), // Include avatarUrl if present
  };

  const token = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);

  return token;
}

// Verify a JWT and return the payload
export async function verifyJWT(
  token: string,
  env: Env
): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Basic validation (check required fields)
    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.provider !== "string" ||
      typeof payload.plan !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      console.error("JWT payload validation failed (basic fields)");
      return null;
    }

    // Return the validated payload, including optional fields
    return {
      sub: payload.sub,
      name: payload.name,
      email: payload.email as string | undefined,
      provider: payload.provider,
      avatarUrl: payload.avatarUrl as string | undefined, // Extract avatarUrl
      plan: payload.plan,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

// Extract JWT from Authorization header
export function extractJWTFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

// Create secure cookie options
export function getSecureCookieOptions(expiresInSeconds: number = 60): string {
  return `HttpOnly; Secure; SameSite=Strict; Max-Age=${expiresInSeconds}; Path=/`;
}
