/// <reference types="@cloudflare/workers-types" />
import { Env } from "../../src/lib/server/api/env";

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const frontendUrl = `${url.origin}/`;

    // Clear the auth_token cookie by setting it to an empty value with an expired date
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie":
          "auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
      },
    });
  } catch (error) {
    console.error("Error in logout function:", error);

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
