/// <reference types="@cloudflare/workers-types" />
import { Env, createJWT, getSecureCookieOptions } from "./jwt";
import { getProviderConfig } from "./providers";
import { createDatabase } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

// Parse cookies from the request
function parseCookies(request: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const cookieHeader = request.headers.get("Cookie");

  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const parts = cookie.trim().split("=");
      if (parts.length >= 2) {
        const name = parts[0].trim();
        // Join with = in case the value itself contains = characters
        const value = parts.slice(1).join("=").trim();
        if (name) {
          cookies[name] = value;
        }
      }
    });
  }

  return cookies;
}

// Exchange the authorization code for an access token
async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  provider: string,
  env: Env
): Promise<{ access_token: string; id_token?: string } | null> {
  const config = getProviderConfig(provider, env);
  if (!config) {
    console.error("Provider config not found for token exchange:", provider);
    return null;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  try {
    console.log(`Exchanging code for token with ${config.tokenUrl}`);
    console.log(`Redirect URI: ${redirectUri}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };

    // Add provider-specific headers if available
    if (config.headers) {
      Object.assign(headers, config.headers);
    }

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers,
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Token exchange failed with status ${response.status}:`,
        errorText
      );
      return null;
    }

    const data = (await response.json()) as Record<string, any>;
    console.log("Token response received:", Object.keys(data).join(", "));

    if (!data.access_token) {
      console.error("No access token in response:", JSON.stringify(data));
      return null;
    }

    return {
      access_token: data.access_token,
      id_token: data.id_token,
    };
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    return null;
  }
}

// Fetch user information from the provider's API
async function fetchUserInfo(
  accessToken: string,
  provider: string,
  env: Env
): Promise<Record<string, any> | null> {
  const config = getProviderConfig(provider, env);
  if (!config) {
    console.error("Provider config not found for:", provider);
    return null;
  }

  try {
    console.log(`Fetching user info from: ${config.userInfoUrl}`);
    console.log(`Using access token: ${accessToken.substring(0, 10)}...`);

    // Combine default headers with provider-specific headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "OAuth-Client",
    };

    // Add provider-specific headers if available
    if (config.headers) {
      Object.assign(headers, config.headers);
    }

    console.log("Request headers:", JSON.stringify(headers));

    const response = await fetch(config.userInfoUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `User info fetch failed with status ${response.status}:`,
        errorText
      );
      return null;
    }

    const userInfo = (await response.json()) as Record<string, any>;
    console.log(
      "User info fetched successfully:",
      JSON.stringify(userInfo).substring(0, 200)
    );
    return userInfo;
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}

// Save or update user in the database
async function saveUserToDatabase(
  userId: string,
  userName: string,
  userEmail: string | undefined,
  provider: string,
  env: Env
): Promise<void> {
  try {
    const db = createDatabase(env.DB);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (existingUser) {
      // Update existing user
      await db
        .update(users)
        .set({
          name: userName,
          email: userEmail,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .run();

      console.log(`Updated existing user in database: ${userId}`);
    } else {
      // Insert new user
      const defaultPlan = "free";
      await db
        .insert(users)
        .values({
          id: userId,
          name: userName,
          email: userEmail,
          provider: provider,
          plan: defaultPlan,
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .run();

      console.log(`Saved new user to database: ${userId}`);
    }
  } catch (error) {
    console.error("Error saving user to database:", error);
    throw error; // Let the caller handle the error
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const provider = url.searchParams.get("provider");

    console.log(
      `Callback received - code: ${code?.substring(0, 10)}..., state: ${state}, provider: ${provider}`
    );

    // Validate required parameters
    if (!code || !state) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: code and state are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!provider) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameter: provider is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify the state parameter to prevent CSRF attacks
    const cookies = parseCookies(request);
    const storedState = cookies["oauth_state"];

    if (!storedState || storedState !== state) {
      return new Response(
        JSON.stringify({ error: "Invalid state parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get the redirect URI - must match exactly what was used in the authorization request
    const redirectUri = `${url.origin}/auth/callback?provider=${provider}`;

    // Exchange the authorization code for an access token
    const tokenResponse = await exchangeCodeForToken(
      code,
      redirectUri,
      provider,
      env
    );
    if (!tokenResponse) {
      return new Response(
        JSON.stringify({ error: "Failed to exchange code for token" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      "Token exchange successful, access token:",
      tokenResponse.access_token?.substring(0, 10) + "..."
    );

    // Fetch user information
    const userInfo = await fetchUserInfo(
      tokenResponse.access_token,
      provider,
      env
    );
    if (!userInfo) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch user information" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get the provider configuration
    const config = getProviderConfig(provider, env);
    if (!config) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract user information
    const userId = userInfo[config.userIdField]?.toString();
    const userName = userInfo[config.userNameField];
    const userEmail = config.userEmailField
      ? userInfo[config.userEmailField]
      : undefined;

    if (!userId || !userName) {
      console.error(
        "Failed to extract user information:",
        JSON.stringify(userInfo)
      );
      return new Response(
        JSON.stringify({
          error: "Failed to extract user information",
          details: {
            userId: !!userId,
            userName: !!userName,
            fields: Object.keys(userInfo),
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Save user to database
    await saveUserToDatabase(userId, userName, userEmail, provider, env);

    // Fetch the complete user data
    const db = createDatabase(env.DB);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch user data" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create a JWT
    const jwt = await createJWT(
      {
        sub: user.id,
        name: user.name,
        email: user.email || undefined,
        provider: user.provider,
        plan: user.plan,
        role: user.role,
      },
      env
    );

    // Set the JWT in a cookie and redirect to the frontend
    const cookieOptions = getSecureCookieOptions();
    const frontendUrl = `${url.origin}/`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: frontendUrl,
        "Set-Cookie": `auth_token=${jwt}; ${cookieOptions}`,
      },
    });
  } catch (error) {
    console.error("Error in callback function:", error);

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
