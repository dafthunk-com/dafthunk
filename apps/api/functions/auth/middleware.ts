/// <reference types="@cloudflare/workers-types" />
import { extractJWTFromHeader, verifyJWT, JWTPayload } from "./jwt";
import { isMockAuthEnabled, MOCK_USER } from "./mock";
import { ensureMockUserInDatabase } from "./mock";
import { Env } from "../../src/lib/server/api/env";

// Parse cookies from the request
export function parseCookies(request: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const cookieHeader = request.headers.get("Cookie");

  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const [name, value] = cookie.trim().split("=");
      cookies[name] = value;
    });
  }

  return cookies;
}

// Authentication result interface
export interface AuthResult {
  isAuthenticated: boolean;
  user?: JWTPayload;
  error?: string;
}

// Middleware to verify authentication
export async function verifyAuth(
  request: Request,
  env: Env
): Promise<AuthResult> {
  // Check if mock auth is enabled
  if (isMockAuthEnabled(env)) {
    // Ensure mock user exists in the database
    await ensureMockUserInDatabase(env);

    return {
      isAuthenticated: true,
      user: {
        sub: MOCK_USER.id,
        name: MOCK_USER.name,
        email: MOCK_USER.email,
        provider: "mock",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      } as JWTPayload,
    };
  }

  // Try to get the JWT from the Authorization header
  const authHeader = request.headers.get("Authorization");
  let token = extractJWTFromHeader(authHeader);

  // If not found in the header, try to get it from the cookie
  if (!token) {
    const cookies = parseCookies(request);
    token = cookies["auth_token"];
  }

  if (!token) {
    return {
      isAuthenticated: false,
      error: "No authentication token provided",
    };
  }

  // Verify the JWT
  const payload = await verifyJWT(token, env);

  if (!payload) {
    return { isAuthenticated: false, error: "Invalid authentication token" };
  }

  return { isAuthenticated: true, user: payload };
}

// Higher-order function to create a protected endpoint
export function withAuth<T extends Env>(
  handler: (request: Request, env: T, user: JWTPayload) => Promise<Response>
) {
  return async (context: { request: Request; env: T }): Promise<Response> => {
    const { request, env } = context;

    try {
      // Verify authentication
      const { isAuthenticated, user, error } = await verifyAuth(request, env);

      if (!isAuthenticated || !user) {
        return new Response(JSON.stringify({ error }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Call the handler with the authenticated user
      return await handler(request, env, user);
    } catch (error) {
      console.error("Error in authentication middleware:", error);

      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}
