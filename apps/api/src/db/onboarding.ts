import { and, eq, isNull, sql } from "drizzle-orm";

import type { Database } from "./index";
import { users } from "./schema";

export type OnboardingStageColumn =
  | "tourCompleted"
  | "workflowCreated"
  | "workflowExecuted"
  | "workflowExecutedOk";

// Set-if-null: idempotent, single UPDATE. The WHERE clause guards against
// overwriting an earlier stamp, so callers don't need their own first-time
// check. Best-effort — callers should swallow errors; these stamps are
// observability, not gating.
export async function stampOnboardingStage(
  db: Database,
  userId: string,
  column: OnboardingStageColumn
): Promise<void> {
  await db
    .update(users)
    .set({ [column]: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(users.id, userId), isNull(users[column])));
}
