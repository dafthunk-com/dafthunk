---
description: Reset local database and apply migrations
---

Reset the local database:

1. Confirm I want to reset (this will delete all local data)
2. Run `pnpm --filter '@dafthunk/api' db:reset` to drop the database
3. Run `pnpm --filter '@dafthunk/api' db:migrate` to apply all migrations
4. Optionally run fixture scripts if I need test data
5. Verify the database is working
