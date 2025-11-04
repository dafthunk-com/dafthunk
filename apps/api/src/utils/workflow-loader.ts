import type { Workflow as WorkflowType } from "@dafthunk/types";

import type { DeploymentStore } from "../stores/deployment-store";
import type { WorkflowStore } from "../stores/workflow-store";

/**
 * Workflow metadata needed for execution
 */
export interface WorkflowMetadata {
  id: string;
  name: string;
  handle: string;
  type: string;
  organizationId: string;
  activeDeploymentId?: string | null;
}

/**
 * Result of loading a workflow for execution
 */
export interface WorkflowLoadResult {
  workflow: WorkflowMetadata;
  workflowData: WorkflowType;
  deploymentId: string | undefined;
}

/**
 * Unified workflow loading logic for all trigger types.
 * Implements the 2-path execution model:
 * - DEV PATH: activeDeploymentId is NULL → load from R2 working version
 * - PROD PATH: activeDeploymentId is set → load from deployment snapshot
 *
 * This ensures consistent behavior across manual, HTTP, email, cron, and queue triggers.
 *
 * @param workflowIdOrHandle - Workflow ID or handle
 * @param organizationId - Organization ID
 * @param workflowStore - Workflow store instance
 * @param deploymentStore - Deployment store instance
 * @returns Workflow metadata, data, and deployment ID (if using prod path)
 * @throws Error if workflow not found or failed to load
 */
export async function loadWorkflowForExecution(
  workflowIdOrHandle: string,
  organizationId: string,
  workflowStore: WorkflowStore,
  deploymentStore: DeploymentStore
): Promise<WorkflowLoadResult> {
  // Get workflow metadata from database
  const workflow = await workflowStore.get(workflowIdOrHandle, organizationId);
  if (!workflow) {
    throw new Error(
      `Workflow '${workflowIdOrHandle}' not found or does not belong to organization '${organizationId}'`
    );
  }

  // Simple 2-path logic based on activeDeploymentId
  if (workflow.activeDeploymentId) {
    // PROD PATH: Load from active deployment snapshot
    try {
      const workflowData = await deploymentStore.readWorkflowSnapshot(
        workflow.activeDeploymentId
      );

      return {
        workflow: {
          id: workflow.id,
          name: workflow.name,
          handle: workflow.handle,
          type: workflow.type,
          organizationId: workflow.organizationId,
          activeDeploymentId: workflow.activeDeploymentId,
        },
        workflowData,
        deploymentId: workflow.activeDeploymentId,
      };
    } catch (error) {
      throw new Error(
        `Failed to load active deployment '${workflow.activeDeploymentId}' for workflow '${workflow.id}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    // DEV PATH: Load from working version in R2
    try {
      const workflowWithData = await workflowStore.getWithData(
        workflow.id,
        organizationId
      );

      if (!workflowWithData || !workflowWithData.data) {
        throw new Error(
          `Failed to load working version for workflow '${workflow.id}': no data found`
        );
      }

      return {
        workflow: {
          id: workflowWithData.id,
          name: workflowWithData.name,
          handle: workflowWithData.handle,
          type: workflowWithData.type,
          organizationId: workflowWithData.organizationId,
          activeDeploymentId: null,
        },
        workflowData: workflowWithData.data,
        deploymentId: undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to load working version for workflow '${workflow.id}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
