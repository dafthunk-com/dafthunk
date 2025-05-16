import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema/index",
  out: "./src/db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
    databaseId: "a89e76fb-ac20-49fc-a797-6a0f08a1dfd7", // Dev DB ID from wrangler.jsonc
    token: process.env.CLOUDFLARE_API_TOKEN || "",
  },
  verbose: true,
  strict: true,
} satisfies Config;
