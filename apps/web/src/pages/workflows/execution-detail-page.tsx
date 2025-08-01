import type { NodeExecution, WorkflowExecution } from "@dafthunk/types";
import { Eye, EyeOff } from "lucide-react";
import { Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { ExecutionInfoCard } from "@/components/executions/execution-info-card";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type {
  WorkflowExecution as WorkflowBuilderExecution,
  WorkflowNodeExecution,
} from "@/components/workflow/workflow-types";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useDeploymentVersion } from "@/services/deployment-service";
import {
  setExecutionPrivate,
  setExecutionPublic,
  useExecution,
} from "@/services/execution-service";
import { useObjectService } from "@/services/object-service";
import {
  convertToReactFlowEdges,
  useWorkflow,
  validateConnection,
} from "@/services/workflow-service";

export function ExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();

  const {
    execution,
    executionError: executionDetailsError,
    isExecutionLoading: isExecutionDetailsLoading,
    mutateExecution: mutateExecutionDetails,
  } = useExecution(executionId || null);

  const { createObjectUrl } = useObjectService();

  // Use empty node templates array since we're in readonly mode
  const nodeTemplates = [];

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

  const [isVisibilityUpdating, setIsVisibilityUpdating] = useState(false);

  useEffect(() => {
    if (executionId) {
      setBreadcrumbs([
        { label: "Executions", to: "/workflows/executions" },
        { label: executionId },
      ]);
    }
  }, [executionId, setBreadcrumbs]);

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

  const handleToggleVisibility = async () => {
    if (!execution || !executionId || !organization?.handle) return;

    setIsVisibilityUpdating(true);
    const newVisibility =
      execution.visibility === "public" ? "private" : "public";

    try {
      let success = false;

      if (newVisibility === "public") {
        success = await setExecutionPublic(executionId, organization.handle);
      } else {
        success = await setExecutionPrivate(executionId, organization.handle);
      }

      if (success) {
        toast.success(`Execution successfully made ${newVisibility}.`);
        mutateExecutionDetails();
      } else {
        toast.error(`Failed to update visibility.`);
      }
    } catch (error) {
      toast.error(
        `Failed to update visibility: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    setIsVisibilityUpdating(false);
  };

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
            {execution && (
              <div className="flex items-center space-x-2">
                {execution.visibility === "public" && executionId && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to={`/public/executions/${executionId}`}
                      target="_blank"
                    >
                      <Share2 className="mr-1 h-4 w-4" />
                      Share
                    </Link>
                  </Button>
                )}
                <LoadingButton
                  variant="outline"
                  size="sm"
                  onClick={handleToggleVisibility}
                  className="ml-0"
                  isLoading={isVisibilityUpdating}
                  icon={
                    execution.visibility === "public" ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )
                  }
                >
                  {execution.visibility === "public"
                    ? "Make Private"
                    : "Make Public"}
                </LoadingButton>
              </div>
            )}
          </div>
          <TabsContent value="status" className="space-y-6 mt-0">
            <ExecutionInfoCard
              id={execution.id}
              status={execution.status}
              visibility={execution.visibility}
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
              nodeTemplates !== undefined ? (
                <WorkflowBuilder
                  workflowId={execution.workflowId || execution.id}
                  initialNodes={reactFlowNodes}
                  initialEdges={reactFlowEdges}
                  nodeTemplates={nodeTemplates}
                  validateConnection={handleValidateConnection}
                  initialWorkflowExecution={workflowBuilderExecution}
                  createObjectUrl={createObjectUrl}
                  readonly={true}
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
