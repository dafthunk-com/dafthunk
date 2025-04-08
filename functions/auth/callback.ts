/// <reference types="@cloudflare/workers-types" />
import { Env } from "../../src/lib/server/api/env";
import { createJWT, getSecureCookieOptions } from "./jwt";
import { getProviderConfig } from "./providers";
import { createDatabase } from "../../db";
import { users } from "../../db/schema";
import { ProviderType } from "../../db/schema";
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
  providerUserId: string,
  userName: string,
  userEmail: string | undefined,
  avatarUrl: string | undefined,
  providerName: string,
  env: Env
): Promise<string> {
  try {
    const db = createDatabase(env.DB as D1Database);
    
    let existingUser: typeof users.$inferSelect | undefined = undefined;
    
    // 1. Try finding by the specific provider ID first
    if (providerName === "github") {
      existingUser = await db
        .select()
        .from(users)
        .where(eq(users.githubId, providerUserId))
        .get();
    } else if (providerName === "google") {
      existingUser = await db
        .select()
        .from(users)
        .where(eq(users.googleId, providerUserId))
        .get();
    }
    
    // 2. If not found by provider ID, try finding by email (if email is available)
    if (!existingUser && userEmail) {
      existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .get();
    }

    if (existingUser) {
      // 3. Update existing user
      const updateData: Partial<typeof users.$inferInsert> = {
        name: userName,
        email: userEmail,
        avatarUrl: avatarUrl,
        updatedAt: new Date(),
        githubId: providerName === "github" ? providerUserId : null,
        googleId: providerName === "google" ? providerUserId : null,
      };
      
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, existingUser.id))
        .run();

      console.log(`Updated existing user in database: ${existingUser.id}, Avatar URL: ${avatarUrl}`);
      return existingUser.id;
    } else {
      // 4. Insert new user
      const uuid = crypto.randomUUID();
      const insertData: typeof users.$inferInsert = {
        id: uuid,
        name: userName,
        email: userEmail,
        avatarUrl: avatarUrl,
        provider: providerName as ProviderType,
        plan: "trial",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        githubId: providerName === "github" ? providerUserId : null,
        googleId: providerName === "google" ? providerUserId : null,
      };
      
      await db
        .insert(users)
        .values(insertData)
        .run();

      console.log(`Saved new user to database: ${uuid}, Avatar URL: ${avatarUrl}`);
      return uuid;
    }
  } catch (error) {
    console.error("Error saving user to database:", error);
    throw error;
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const providerName = url.searchParams.get("provider");

    console.log(
      `Callback received - code: ${code?.substring(0, 10)}..., state: ${state}, provider: ${providerName}`
    );

    // Validate required parameters
    if (!code || !state || !providerName) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: code, state, and provider are required",
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
    const redirectUri = `${url.origin}/auth/callback?provider=${providerName}`;

    // Exchange the authorization code for an access token
    const tokenResponse = await exchangeCodeForToken(
      code,
      redirectUri,
      providerName,
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
      providerName,
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
    const config = getProviderConfig(providerName, env);
    if (!config) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract user information
    const providerUserId = userInfo[config.userIdField]?.toString();
    const userName = userInfo[config.userNameField];
    const userEmail = config.userEmailField
      ? userInfo[config.userEmailField]
      : undefined;
    const avatarUrl = config.userAvatarField ? userInfo[config.userAvatarField] : undefined;

    if (!providerUserId || !userName) {
      console.error(
        "Failed to extract user information:",
        JSON.stringify(userInfo)
      );
      return new Response(
        JSON.stringify({
          error: "Failed to extract user information",
          details: {
            providerUserId: !!providerUserId,
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
    const savedUserId = await saveUserToDatabase(
      providerUserId,
      userName,
      userEmail,
      avatarUrl,
      providerName,
      env
    );

    // Fetch the complete user data needed for JWT
    const db = createDatabase(env.DB as D1Database);
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        plan: users.plan,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, savedUserId))
      .get();

    if (!user) {
      return new Response(JSON.stringify({ error: "Failed to fetch final user data" }), { status: 500 });
    }

    // Create JWT with avatarUrl, without provider IDs
    const jwt = await createJWT(
      {
        sub: user.id,
        name: user.name,
        email: user.email || undefined,
        provider: providerName,
        avatarUrl: user.avatarUrl || undefined,
        plan: user.plan,
        role: user.role,
      },
      env
    );

    // Set the JWT in a cookie and redirect to the frontend
    const cookieOptions = getSecureCookieOptions(3600); // Match JWT expiration (1 hour)
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
