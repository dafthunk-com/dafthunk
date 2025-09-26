# Pipelines

Follow the following tutorial:
https://developers.cloudflare.com/pipelines/getting-started/

The schema.json contains the schema for storing executions.

```bash
npx wrangler r2 bucket create dafthunk-events-production
npx wrangler r2 bucket catalog enable dafthunk-events-production
npx wrangler pipelines setup
```
