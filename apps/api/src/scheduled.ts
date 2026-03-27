import CronParser from "cron-parser";

import type { Bindings } from "./context";
import {
  createDatabase,
  getActiveScheduledTriggers,
  getOrganizationBillingInfo,
  resolveOrganizationPlan,
} from "./db";
import { getAgentByName } from "./durable-objects/agent-utils";
import { createWorkerRuntime } from "./runtime/cloudflare-worker-runtime";
import { WorkflowStore } from "./stores/workflow-store";

export async function handleScheduledEvent(
  _event: ScheduledEvent,
  env: Bindings,
  _ctx: ExecutionContext
): Promise<void> {
  console.log("Scheduled event triggered at:", new Date().toISOString());

  const db = createDatabase(env.DB);
  const workflowStore = new WorkflowStore(env);

  // Get all active scheduled triggers
  const triggers = await getActiveScheduledTriggers(db);
  console.log(`Found ${triggers.length} active scheduled triggers`);

  const now = Date.now();

  for (const { scheduledTrigger, workflow } of triggers) {
    try {
      // Skip workflows that are not enabled
      if (!workflow.enabled) {
        console.log(`Skipping scheduled workflow ${workflow.id}: not enabled`);
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

      // Load workflow data from working version
      const workflowWithData = await workflowStore.getWithData(
        workflow.id,
        workflow.organizationId
      );
      if (!workflowWithData?.data) {
        console.error(`Failed to load workflow data for ${workflow.id}`);
        continue;
      }
      const workflowData = workflowWithData.data;

      // Get organization billing info
      const billingInfo = await getOrganizationBillingInfo(
        db,
        workflow.organizationId
      );
      if (billingInfo === undefined) continue;

      const executionParams = {
        userId: "scheduled_trigger",
        organizationId: workflow.organizationId,
        computeCredits: billingInfo.computeCredits,
        userPlan: resolveOrganizationPlan(billingInfo),
        workflow: {
          id: workflow.id,
          name: workflow.name,
          trigger: workflowData.trigger,
          runtime: workflowData.runtime,
          nodes: workflowData.nodes,
          edges: workflowData.edges,
        },
        scheduledTrigger: {
          timestamp: now,
          scheduledTime: scheduledTime.getTime(),
          scheduleExpression: scheduledTrigger.scheduleExpression,
        },
      };

      // Use WorkerRuntime for "worker" runtime (synchronous execution)
      // Use Cloudflare Workflows for "workflow" runtime (durable execution, default)
      if (workflowData.runtime === "worker") {
        const workerRuntime = createWorkerRuntime(env);
        const execution = await workerRuntime.execute(executionParams);
        console.log(
          `[Execution] ${execution.id} workflow=${workflow.id} runtime=worker trigger=scheduled`
        );
      } else {
        const agent = await getAgentByName(env.WORKFLOW_AGENT, workflow.id);
        const executionId = await agent.executeWorkflow(executionParams);
        console.log(
          `[Execution] ${executionId} workflow=${workflow.id} runtime=workflow trigger=scheduled`
        );
      }
    } catch (error) {
      console.error(
        `Error executing scheduled workflow ${workflow.id}:`,
        error
      );
    }
  }
}
