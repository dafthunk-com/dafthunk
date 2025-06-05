import CronParser from "cron-parser"; // Or your chosen cron library
import { and, eq, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { cronTriggers } from "./db/schema";

// This is a placeholder. You need to implement how workflows are triggered.
// If executeWorkflow becomes more complex or used elsewhere, it could also be in its own file.
async function executeWorkflow(
  workflowId: string,
  _env: any,
  _ctx: any
): Promise<void> {
  console.log(`Executing workflow ${workflowId}`);
  // Example: await fetch(`https://your-service.com/api/execute-workflow/${workflowId}`, { method: 'POST' });
  // Or: directly call a function if workflow logic is bundled
  // Remember to handle errors appropriately.
  await Promise.resolve(); // Replace with actual workflow execution logic
}

export async function handleCronTriggers(
  event: ScheduledEvent,
  env: { DB: D1Database },
  ctx: ExecutionContext
): Promise<void> {
  console.log(`Cron event triggered at: ${new Date(event.scheduledTime)}`);
  const db = drizzle(env.DB, { schema: { cronTriggers } });

  const now = new Date();

  try {
    const dueTriggers = await db
      .select()
      .from(cronTriggers)
      .where(
        and(eq(cronTriggers.active, true), lte(cronTriggers.nextRunAt, now))
      )
      .all();

    if (dueTriggers.length === 0) {
      console.log("No due cron triggers found.");
      return;
    }

    console.log(`Found ${dueTriggers.length} due cron triggers.`);

    for (const trigger of dueTriggers) {
      console.log(`Processing trigger for workflow: ${trigger.workflowId}`);
      try {
        // 1. Execute the workflow
        await executeWorkflow(trigger.workflowId, env, ctx);

        // 2. Calculate next run time
        const interval = CronParser.parse(trigger.cronExpression, {
          currentDate: now,
        });
        const nextRun = interval.next().toDate();

        // 3. Update the trigger in the database
        await db
          .update(cronTriggers)
          .set({
            lastRun: now,
            nextRunAt: nextRun,
          })
          .where(eq(cronTriggers.workflowId, trigger.workflowId))
          .execute();

        console.log(
          `Workflow ${trigger.workflowId} executed. Next run at: ${nextRun.toISOString()}`
        );
      } catch (err) {
        console.error(
          `Error processing trigger for workflow ${trigger.workflowId}:`,
          err
        );
        // Optionally, you might want to implement retry logic or disable the trigger after too many failures.
      }
    }
  } catch (dbError) {
    console.error("Database error during scheduled task:", dbError);
  }
}
