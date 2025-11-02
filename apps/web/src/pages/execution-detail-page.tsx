import type { NodeExecution, WorkflowExecution } from "@dafthunk/types";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { ExecutionInfoCard } from "@/components/executions/execution-info-card";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type {
  WorkflowExecution as WorkflowBuilderExecution,
  WorkflowNodeExecution,
} from "@/components/workflow/workflow-types";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useDeploymentVersion } from "@/services/deployment-service";
import { useExecution } from "@/services/execution-service";
import { useObjectService } from "@/services/object-service";
import {
  convertToReactFlowEdges,
  useWorkflow,
  validateConnection,
} from "@/services/workflow-service";

export function ExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();

  const {
    execution,
    executionError: executionDetailsError,
    isExecutionLoading: isExecutionDetailsLoading,
  } = useExecution(executionId || null);

  const { createObjectUrl } = useObjectService();

  // Use empty node templates array since we're in readonly mode
  const nodeTypes = [];

  const { workflow: workflowInfo } = useWorkflow(execution?.workflowId || null);

  // Handle the case when deploymentId might be undefined
  const deploymentId = execution?.deploymentId || "";
  const hasDeploymentId = !!execution?.deploymentId;

  // Always call the hook - the hook internally handles empty/falsy values by setting swrKey to null
  const {
    deploymentVersion: deploymentStructureSource,
    isDeploymentVersionLoading: isDeploymentStructureLoading,
  } = useDeploymentVersion(deploymentId);

  const {
    workflow: workflowStructureSourceFromDetails,
    isWorkflowLoading: isWorkflowStructureDetailsLoading,
  } = useWorkflow(
    execution?.deploymentId ? null : execution?.workflowId || null
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
    if (executionId) {
      setBreadcrumbs([
        { label: "Executions", to: getOrgUrl("executions") },
        { label: executionId },
      ]);
    }
  }, [executionId, setBreadcrumbs, getOrgUrl]);

  useEffect(() => {
    if (executionDetailsError) {
      toast.error(
        `Failed to fetch execution details: ${executionDetailsError.message}`
      );
    }
  }, [executionDetailsError]);

  useEffect(() => {
    if (finalStructure && execution?.nodeExecutions) {
      const execMap = new Map<string, NodeExecution>();
      for (const n of execution.nodeExecutions || []) execMap.set(n.nodeId, n);

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
          })),
          outputs: (node.outputs || []).map((output: any) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            value: execMap.get(node.id)?.outputs?.[output.name],
            hidden: output.hidden,
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
        status: execution.status as WorkflowExecution["status"],
        nodeExecutions: (execution.nodeExecutions || []).map(
          (nodeExec: NodeExecution): WorkflowNodeExecution => ({
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

  if (isExecutionDetailsLoading || isStructureOverallLoading) {
    return <InsetLoading title="Execution Details" />;
  } else if (executionDetailsError) {
    return (
      <InsetError
        title="Execution Details"
        errorMessage={executionDetailsError.message}
      />
    );
  }

  if (!execution) {
    return (
      <InsetLayout title="Execution Not Found">
        <div className="text-center py-10">
          <p className="text-lg">Execution not found or an error occurred.</p>
        </div>
      </InsetLayout>
    );
  }

  return (
    <InsetLayout title={`${executionId}`}>
      <div className="space-y-6">
        <Tabs defaultValue="status">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
            </TabsList>
            {execution && <div className="flex items-center space-x-2"></div>}
          </div>
          <TabsContent value="status" className="space-y-6 mt-0">
            <ExecutionInfoCard
              id={execution.id}
              status={execution.status}
              startedAt={execution.startedAt}
              endedAt={execution.endedAt}
              workflowId={execution.workflowId}
              workflowName={workflowInfo?.name}
              deploymentId={execution.deploymentId}
              error={execution.error}
            />
          </TabsContent>
          <TabsContent value="visualization" className="mt-0">
            <div className="h-[calc(100vh-300px)] border rounded-md relative">
              {reactFlowNodes.length > 0 &&
              workflowBuilderExecution &&
              nodeTypes !== undefined ? (
                <WorkflowBuilder
                  workflowId={execution.workflowId || execution.id}
                  initialNodes={reactFlowNodes}
                  initialEdges={reactFlowEdges}
                  nodeTypes={nodeTypes}
                  validateConnection={handleValidateConnection}
                  initialWorkflowExecution={workflowBuilderExecution}
                  createObjectUrl={createObjectUrl}
                  disabled={true}
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
          </TabsContent>
        </Tabs>
      </div>
    </InsetLayout>
  );
}
