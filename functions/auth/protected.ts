/// <reference types="@cloudflare/workers-types" />
import { Env, JWTPayload } from './jwt';
import { withAuth } from './middleware';

// Handler for the protected endpoint
async function protectedHandler(request: Request, env: Env, user: JWTPayload): Promise<Response> {
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
  return withAuth<Env>(protectedHandler)(context);
}; 