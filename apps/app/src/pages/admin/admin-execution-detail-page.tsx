import type { NodeExecution, WorkflowExecution } from "@dafthunk/types";
import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type {
  WorkflowExecution as WorkflowBuilderExecution,
  WorkflowNodeExecution,
} from "@/components/workflow/workflow-types";
import { useAdminExecutionDetail } from "@/services/admin-service";
import { useDeploymentVersionWithOrgHandle } from "@/services/deployment-service";
import { useObjectService } from "@/services/object-service";
import {
  convertToReactFlowEdges,
  useWorkflowWithOrgHandle,
  validateConnection,
} from "@/services/workflow-service";

export function AdminExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get("organizationId") || undefined;

  const { execution, executionError, isExecutionLoading } =
    useAdminExecutionDetail(executionId, organizationId);
  const setBreadcrumbs = useBreadcrumbsSetter();

  const { createObjectUrl } = useObjectService();

  // Use empty node templates array since we're in readonly mode
  const nodeTypes: never[] = [];

  // Get the organization handle from the execution
  const orgHandle = execution?.organizationHandle || null;

  // Fetch workflow metadata for name/description
  const {
    workflow: workflowMetadata,
    isWorkflowLoading: isWorkflowMetadataLoading,
  } = useWorkflowWithOrgHandle(execution?.workflowId || null, orgHandle);

  // Handle the case when deploymentId might be undefined
  const deploymentId = execution?.deploymentId || "";
  const hasDeploymentId = !!execution?.deploymentId;

  // Fetch deployment structure if there's a deployment
  const {
    deploymentVersion: deploymentStructureSource,
    isDeploymentVersionLoading: isDeploymentStructureLoading,
  } = useDeploymentVersionWithOrgHandle(deploymentId, orgHandle);

  // Fetch workflow structure if there's no deployment
  const {
    workflow: workflowStructureSourceFromDetails,
    isWorkflowLoading: isWorkflowStructureDetailsLoading,
  } = useWorkflowWithOrgHandle(
    execution?.deploymentId ? null : execution?.workflowId || null,
    orgHandle
  );

  const finalStructure = useMemo(() => {
    // If we have a deploymentId, use the deployment structure.
    // Otherwise, use the workflow structure.
    return hasDeploymentId
      ? deploymentStructureSource
      : workflowStructureSourceFromDetails;
  }, [
    hasDeploymentId,
    deploymentStructureSource,
    workflowStructureSourceFromDetails,
  ]);

  const isStructureOverallLoading = useMemo(() => {
    if (execution?.deploymentId) return isDeploymentStructureLoading;
    if (execution?.workflowId) return isWorkflowStructureDetailsLoading;
    return false;
  }, [
    execution,
    isDeploymentStructureLoading,
    isWorkflowStructureDetailsLoading,
  ]);

  const [reactFlowNodes, setReactFlowNodes] = useState<any[]>([]);
  const [reactFlowEdges, setReactFlowEdges] = useState<any[]>([]);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Executions", to: "/admin/executions" },
      { label: executionId?.substring(0, 8) || "Execution Details" },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, executionId]);

  useEffect(() => {
    if (finalStructure && execution?.nodeExecutions) {
      const execMap = new Map<string, NodeExecution>();
      for (const n of execution.nodeExecutions || []) {
        execMap.set(n.nodeId, n as NodeExecution);
      }

      const rNodes = (finalStructure.nodes || []).map((node: any) => ({
        id: node.id,
        type: "workflowNode",
        position: node.position,
        data: {
          name: node.name,
          inputs: (node.inputs || []).map((input: any) => ({
            id: input.name,
            type: input.type,
            name: input.name,
            value:
              (execMap.get(node.id) as any)?.input?.[input.name] ?? input.value,
            hidden: input.hidden,
            required: input.required,
            repeated: input.repeated,
          })),
          outputs: (node.outputs || []).map((output: any) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            value: execMap.get(node.id)?.outputs?.[output.name],
            hidden: output.hidden,
            repeated: output.repeated,
          })),
          executionState: execMap.get(node.id)?.status || "idle",
          error: execMap.get(node.id)?.error,
          nodeType: node.type,
          icon: node.icon,
        },
      }));
      setReactFlowNodes(rNodes);

      const rEdges = Array.from(
        convertToReactFlowEdges(finalStructure.edges || [])
      );
      setReactFlowEdges(rEdges);
    } else {
      setReactFlowNodes([]);
      setReactFlowEdges([]);
    }
  }, [finalStructure, execution]);

  const workflowBuilderExecution =
    useMemo<WorkflowBuilderExecution | null>(() => {
      if (!execution) return null;
      return {
        id: execution.id,
        status: execution.status as WorkflowExecution["status"],
        nodeExecutions: (execution.nodeExecutions || []).map(
          (nodeExec): WorkflowNodeExecution => ({
            nodeId: nodeExec.nodeId,
            status: nodeExec.status as any,
            outputs: nodeExec.outputs || {},
            error: nodeExec.error,
          })
        ),
      };
    }, [execution]);

  const handleValidateConnection = useMemo(
    () => (connection: any) =>
      validateConnection(connection, reactFlowEdges).status === "valid",
    [reactFlowEdges]
  );

  if (!organizationId) {
    return (
      <InsetError
        title="Execution Details"
        errorMessage="Organization ID is required"
      />
    );
  }

  if (
    isExecutionLoading ||
    isStructureOverallLoading ||
    isWorkflowMetadataLoading
  ) {
    return <InsetLoading title="Execution Details" />;
  }

  if (executionError) {
    return (
      <InsetError
        title="Execution Details"
        errorMessage={executionError.message}
      />
    );
  }

  if (!execution) {
    return (
      <InsetError
        title="Execution Details"
        errorMessage="Execution not found"
      />
    );
  }

  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex flex-col relative">
        <div className="h-full w-full flex-grow">
          {reactFlowNodes.length > 0 &&
          workflowBuilderExecution &&
          nodeTypes !== undefined ? (
            <WorkflowBuilder
              workflowId={execution.workflowId || execution.id}
              workflowName={workflowMetadata?.name || execution.workflowName}
              workflowDescription={workflowMetadata?.description}
              workflowTrigger={workflowMetadata?.trigger}
              workflowRuntime={workflowMetadata?.runtime}
              initialNodes={reactFlowNodes}
              initialEdges={reactFlowEdges}
              nodeTypes={nodeTypes}
              validateConnection={handleValidateConnection}
              initialWorkflowExecution={workflowBuilderExecution}
              createObjectUrl={createObjectUrl}
              disabledWorkflow={true}
              disabledFeedback={true}
              orgHandle={orgHandle || ""}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-muted-foreground">
                {isStructureOverallLoading
                  ? "Loading workflow data..."
                  : "No workflow structure available or still loading components."}
              </p>
            </div>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
