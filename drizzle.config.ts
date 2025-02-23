import type { Config } from 'drizzle-kit';

export default {
  schema: './functions/db/schema.ts',
  out: './functions/db/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    // These will be populated from wrangler.toml
    databaseId: '',
    accountId: '',
    token: '',
  },
  verbose: true,
  strict: true,
} satisfies Config; 