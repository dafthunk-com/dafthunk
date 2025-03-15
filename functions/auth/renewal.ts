/// <reference types="@cloudflare/workers-types" />
import { Env, createJWT, getSecureCookieOptions, JWTPayload } from "./jwt";
import { verifyAuth } from "./middleware";
import { isMockAuthEnabled, MOCK_USER } from "./mock";

/**
 * Token renewal endpoint
 * 
 * This endpoint allows for automatic renewal of JWT tokens before they expire.
 * It verifies the current token and issues a new one with a fresh expiration time.
 * 
 * The client should call this endpoint a few minutes before the token is set to expire.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // Verify the current token
    const { isAuthenticated, user, error } = await verifyAuth(request, env);

    if (!isAuthenticated || !user) {
      return new Response(JSON.stringify({ 
        error: error || "Authentication required",
        code: "token_invalid"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if the token is about to expire (less than 5 minutes remaining)
    // This is optional but prevents unnecessary renewals of fresh tokens
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = user.exp - currentTime;
    
    // Include token expiration information in the response
    const tokenInfo = {
      expiresIn: timeRemaining,
      issuedAt: user.iat,
      expiresAt: user.exp
    };

    // If token has more than 5 minutes remaining, return success but don't renew
    // This is optional and can be adjusted based on your needs
    if (timeRemaining > 300) {
      return new Response(JSON.stringify({ 
        message: "Token is still valid",
        renewed: false,
        tokenInfo
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a new JWT with a fresh expiration time
    const jwt = await createJWT(
      {
        sub: user.sub,
        name: user.name,
        email: user.email,
        provider: user.provider,
      },
      env
    );

    // Set the new JWT in a cookie
    const cookieOptions = getSecureCookieOptions();

    // Calculate new expiration time (15 minutes from now)
    const newExpirationTime = Math.floor(Date.now() / 1000) + 15 * 60;

    return new Response(JSON.stringify({ 
      message: "Token renewed successfully",
      renewed: true,
      tokenInfo: {
        expiresIn: 15 * 60, // 15 minutes in seconds
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: newExpirationTime
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `auth_token=${jwt}; ${cookieOptions}`,
      },
    });
  } catch (error) {
    console.error("Error in token renewal:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
        code: "renewal_error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}; 