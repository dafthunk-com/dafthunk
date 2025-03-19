/// <reference types="@cloudflare/workers-types" />
import { Env } from "./jwt";
import { createDatabase } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

export interface MockUser {
  id: string;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export const MOCK_USER: MockUser = {
  id: "mock-user-id",
  login: "mock-user",
  name: "Mock User",
  email: "mock@example.com",
  avatar_url: "https://avatars.githubusercontent.com/u/0",
};

export const isMockAuthEnabled = (env: Env): boolean => {
  return env.MOCK_AUTH === "true" || env.MOCK_AUTH === "1";
};

// Ensure mock user exists in the database
export const ensureMockUserInDatabase = async (env: Env): Promise<void> => {
  if (!isMockAuthEnabled(env)) {
    return;
  }

  try {
    const db = createDatabase(env.DB);
    
    // Check if mock user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, MOCK_USER.id))
      .get();
    
    if (!existingUser) {
      // Insert mock user if not exists
      await db
        .insert(users)
        .values({
          id: MOCK_USER.id,
          name: MOCK_USER.name,
          email: MOCK_USER.email,
          provider: "mock",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .run();
      
      console.log("Mock user created in database");
    }
  } catch (error) {
    console.error("Error ensuring mock user in database:", error);
  }
};

export const createMockResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

export const createMockAuthResponse = () => {
  const token = "mock-jwt-token";
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`,
    },
  });
};
