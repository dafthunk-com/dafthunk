import CronParser from "cron-parser";

import type { Bindings } from "./context";
import {
  createDatabase,
  getActiveScheduledTriggers,
  getOrganizationComputeCredits,
} from "./db";
import { DeploymentStore } from "./stores/deployment-store";

export async function handleScheduledEvent(
  _event: ScheduledEvent,
  env: Bindings,
  _ctx: ExecutionContext
): Promise<void> {
  console.log("Scheduled event triggered at:", new Date().toISOString());

  const db = createDatabase(env.DB);
  const deploymentStore = new DeploymentStore(env);

  // Get all active scheduled triggers
  const triggers = await getActiveScheduledTriggers(db);
  console.log(`Found ${triggers.length} active scheduled triggers`);

  const now = Date.now();

  for (const { scheduledTrigger, workflow } of triggers) {
    try {
      // Skip workflows that haven't been deployed
      // Scheduled workflows should only run in production mode
      if (!workflow.activeDeploymentId) {
        console.log(
          `Skipping scheduled workflow ${workflow.id}: not deployed (dev mode only)`
        );
        continue;
      }

      // Parse schedule expression
      const interval = CronParser.parse(scheduledTrigger.scheduleExpression, {
        currentDate: new Date(now),
        tz: "UTC",
      });

      const scheduledTime = interval.prev().toDate();

      // Check if should run now (within last minute since we run every minute)
      if (Math.abs(now - scheduledTime.getTime()) > 60000) {
        continue; // Not time to execute
      }

      console.log(
        `Executing scheduled workflow ${workflow.id} (${scheduledTrigger.scheduleExpression})`
      );

      // Load workflow data from active deployment
      const workflowData = await deploymentStore.readWorkflowSnapshot(
        workflow.activeDeploymentId
      );
      const deploymentId = workflow.activeDeploymentId;

      // Get organization compute credits
      const computeCredits = await getOrganizationComputeCredits(
        db,
        workflow.organizationId
      );
      if (computeCredits === undefined) continue;

      // Execute workflow with scheduled trigger context
      await env.EXECUTE.create({
        params: {
          userId: "scheduled_trigger",
          organizationId: workflow.organizationId,
          computeCredits,
          workflow: {
            id: workflow.id,
            name: workflow.name,
            handle: workflow.handle,
            type: workflowData.type,
            nodes: workflowData.nodes,
            edges: workflowData.edges,
          },
          deploymentId,
          scheduledTrigger: {
            timestamp: now,
            scheduledTime: scheduledTime.getTime(),
            scheduleExpression: scheduledTrigger.scheduleExpression,
          },
        },
      });

      console.log(`Scheduled workflow ${workflow.id} started`);
    } catch (error) {
      console.error(
        `Error executing scheduled workflow ${workflow.id}:`,
        error
      );
    }
  }
}
