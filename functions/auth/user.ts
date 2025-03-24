/// <reference types="@cloudflare/workers-types" />
import { Env, JWTPayload } from "./jwt";
import { withAuth } from "./middleware";

// Handler for the user endpoint
async function userHandler(
  request: Request,
  env: Env,
  user: JWTPayload
): Promise<Response> {
  // Return the user information from the JWT
  return new Response(
    JSON.stringify({
      user: {
        id: user.sub,
        name: user.name,
        email: user.email,
        provider: user.provider,
        plan: user.plan,
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

// Export the user endpoint with authentication middleware
export const onRequestGet: PagesFunction<Env> = async (context) => {
  return withAuth<Env>(userHandler)(context);
};
