import { SignJWT, jwtVerify } from "jose";

// Define the environment variables interface
export interface Env {
  JWT_SECRET: string;
  [key: string]: any;
}

// Define the JWT payload structure
export interface JWTPayload {
  sub: string; // Subject (user ID)
  name: string; // User's name
  email?: string; // User's email (optional)
  provider: string; // OAuth provider (e.g., 'github')
  plan?: string; // User's subscription plan
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
}

// Create and sign a JWT
export async function createJWT(
  payload: Omit<JWTPayload, "iat" | "exp">,
  env: Env
): Promise<string> {
  // Get the JWT secret from environment variables
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  // Set token expiration (60 seconds from now)
  const expirationTime = Math.floor(Date.now() / 1000) + 60;

  // Create and sign the JWT
  const token = await new SignJWT({ ...payload })
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

    // Validate that the payload has the required fields
    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.provider !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      name: payload.name,
      email: payload.email as string | undefined,
      provider: payload.provider as string,
      plan: payload.plan as string | undefined,
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
