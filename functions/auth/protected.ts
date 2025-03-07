/// <reference types="@cloudflare/workers-types" />
import { Env, JWTPayload } from './jwt';
import { withAuth } from './middleware';
import { isMockAuthEnabled, MOCK_USER, createMockResponse } from './mock';

// Handler for the protected endpoint
async function protectedHandler(request: Request, env: Env, user: JWTPayload): Promise<Response> {
  // If mock auth is enabled, return mock user data
  if (isMockAuthEnabled(env)) {
    return createMockResponse({
      message: 'You have access to this protected resource (MOCK)',
      user: {
        id: MOCK_USER.id,
        name: MOCK_USER.name,
        email: MOCK_USER.email,
        provider: 'mock'
      }
    });
  }

  return new Response(
    JSON.stringify({
      message: 'You have access to this protected resource',
      user: {
        id: user.sub,
        name: user.name,
        email: user.email,
        provider: user.provider
      }
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Export the protected endpoint with authentication middleware
export const onRequestGet: PagesFunction<Env> = async (context) => {
  // If mock auth is enabled, bypass authentication middleware
  if (isMockAuthEnabled(context.env)) {
    return protectedHandler(context.request, context.env, {
      sub: MOCK_USER.id,
      name: MOCK_USER.name,
      email: MOCK_USER.email,
      provider: 'mock',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    });
  }
  return withAuth<Env>(protectedHandler)(context);
}; 