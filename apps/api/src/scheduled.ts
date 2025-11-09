import CronParser from "cron-parser";

import type { Bindings } from "./context";
import {
  createDatabase,
  getActiveScheduledTriggers,
  getOrganizationComputeCredits,
} from "./db";
import { DeploymentStore } from "./stores/deployment-store";
import { WorkflowStore } from "./stores/workflow-store";

export async function handleScheduledEvent(
  _event: ScheduledEvent,
  env: Bindings,
  _ctx: ExecutionContext
): Promise<void> {
  console.log("Scheduled event triggered at:", new Date().toISOString());

  const db = createDatabase(env.DB);
  const workflowStore = new WorkflowStore(env);
  const deploymentStore = new DeploymentStore(env);

  // Get all active scheduled triggers
  const triggers = await getActiveScheduledTriggers(db);
  console.log(`Found ${triggers.length} active scheduled triggers`);

  const now = Date.now();

  for (const { scheduledTrigger, workflow } of triggers) {
    try {
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

      // Load workflow data (dev mode if no deployment, else prod)
      let workflowData: any;
      let deploymentId: string | undefined;

      if (workflow.activeDeploymentId) {
        // PROD MODE
        workflowData = await deploymentStore.readWorkflowSnapshot(
          workflow.activeDeploymentId
        );
        deploymentId = workflow.activeDeploymentId;
      } else {
        // DEV MODE
        const wf = await workflowStore.getWithData(
          workflow.id,
          workflow.organizationId
        );
        if (!wf) continue;
        workflowData = wf.data;
      }

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
