import type {
  NodeExecution,
  WorkflowExecution,
  WorkflowRuntime,
  WorkflowTrigger,
} from "@dafthunk/types";
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
import {
  useAdminDeploymentStructure,
  useAdminExecutionDetail,
  useAdminWorkflowStructure,
} from "@/services/admin-service";
import { useObjectService } from "@/services/object-service";
import {
  convertToReactFlowEdges,
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

  // Determine what to fetch based on whether we have a deployment
  const hasDeploymentId = !!execution?.deploymentId;

  // Fetch workflow structure using admin endpoint (for metadata and when no deployment)
  const { workflowStructure, isWorkflowStructureLoading } =
    useAdminWorkflowStructure(
      execution?.workflowId || null,
      organizationId || null
    );

  // Fetch deployment structure using admin endpoint (when we have a deployment)
  const { deploymentStructure, isDeploymentStructureLoading } =
    useAdminDeploymentStructure(
      execution?.deploymentId || null,
      organizationId || null
    );

  // Use deployment structure if available, otherwise use workflow structure
  const finalStructure = useMemo(() => {
    if (hasDeploymentId && deploymentStructure) {
      return {
        nodes: deploymentStructure.nodes || [],
        edges: deploymentStructure.edges || [],
      };
    }
    if (workflowStructure) {
      return {
        nodes: workflowStructure.nodes || [],
        edges: workflowStructure.edges || [],
      };
    }
    return null;
  }, [hasDeploymentId, deploymentStructure, workflowStructure]);

  const isStructureOverallLoading = useMemo(() => {
    if (execution?.deploymentId) return isDeploymentStructureLoading;
    if (execution?.workflowId) return isWorkflowStructureLoading;
    return false;
  }, [execution, isDeploymentStructureLoading, isWorkflowStructureLoading]);

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

      const rNodes = finalStructure.nodes.map((node: any) => ({
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

      const rEdges = Array.from(convertToReactFlowEdges(finalStructure.edges));
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

  if (isExecutionLoading || isStructureOverallLoading) {
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
              workflowName={workflowStructure?.name || execution.workflowName}
              workflowDescription={workflowStructure?.description ?? undefined}
              workflowTrigger={
                workflowStructure?.trigger as WorkflowTrigger | undefined
              }
              workflowRuntime={
                workflowStructure?.runtime as WorkflowRuntime | undefined
              }
              initialNodes={reactFlowNodes}
              initialEdges={reactFlowEdges}
              nodeTypes={nodeTypes}
              validateConnection={handleValidateConnection}
              initialWorkflowExecution={workflowBuilderExecution}
              createObjectUrl={createObjectUrl}
              disabledWorkflow={true}
              disabledFeedback={true}
              orgHandle={execution.organizationHandle || ""}
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
