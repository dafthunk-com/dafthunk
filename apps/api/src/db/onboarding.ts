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
//
// `unixepoch()` writes an INTEGER. `CURRENT_TIMESTAMP` returns a TEXT
// 'YYYY-MM-DD HH:MM:SS' literal which SQLite's type affinity refuses to
// coerce into the INTEGER column — it sticks around as TEXT and Drizzle's
// timestamp reader then evaluates `text * 1000` → NaN → Invalid Date, which
// JSON-serializes to null on the wire and breaks every downstream consumer.
export async function stampOnboardingStage(
  db: Database,
  userId: string,
  column: OnboardingStageColumn
): Promise<void> {
  await db
    .update(users)
    .set({ [column]: sql`(unixepoch())` })
    .where(and(eq(users.id, userId), isNull(users[column])));
}
