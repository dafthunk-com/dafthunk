import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { toast } from "sonner";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  useExecutionDetails,
  useNodeTemplates,
  useWorkflowDetails,
  useDeploymentVersion,
} from "@/hooks/use-fetch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type {
  WorkflowExecution as WorkflowBuilderExecution,
  WorkflowNodeExecution,
} from "@/components/workflow/workflow-types";
import { workflowEdgeService } from "@/services/workflowEdgeService";
import { executionsService } from "@/services/executionsService";
import type { NodeExecution, WorkflowExecution } from "@dafthunk/types";
import { ExecutionInfoCard } from "@/components/executions/execution-info-card";
import { InsetLoading } from "@/components/inset-loading";
import { InsetError } from "@/components/inset-error";
import { Eye, EyeOff } from "lucide-react";
import { Share2 } from "lucide-react";

export function ExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const {
    executionDetails: execution,
    executionDetailsError,
    isExecutionDetailsLoading,
  } = useExecutionDetails(executionId);

  const { nodeTemplates, nodeTemplatesError, isNodeTemplatesLoading } =
    useNodeTemplates();

  const { workflowDetails: workflowInfo } = useWorkflowDetails(
    execution?.workflowId
  );

  const {
    deploymentVersion: deploymentStructureSource,
    isDeploymentVersionLoading: isDeploymentStructureLoading,
  } = useDeploymentVersion(execution?.deploymentId);

  const {
    workflowDetails: workflowStructureSourceFromDetails,
    isWorkflowDetailsLoading: isWorkflowStructureDetailsLoading,
  } = useWorkflowDetails(
    execution?.deploymentId ? undefined : execution?.workflowId
  );

  const finalStructure = useMemo(() => {
    return deploymentStructureSource || workflowStructureSourceFromDetails;
  }, [deploymentStructureSource, workflowStructureSourceFromDetails]);

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
    if (nodeTemplatesError) {
      toast.error(
        `Failed to load node templates: ${nodeTemplatesError.message}`
      );
    }
  }, [executionDetailsError, nodeTemplatesError]);

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
        },
      }));
      setReactFlowNodes(rNodes);

      const rEdges = Array.from(
        workflowEdgeService.convertToReactFlowEdges(finalStructure.edges || [])
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

  const validateConnection = () => false;

  const handleToggleVisibility = async () => {
    if (!execution) return;
    setIsVisibilityUpdating(true);
    const newVisibility =
      execution.visibility === "public" ? "private" : "public";
    try {
      if (newVisibility === "public") {
        await executionsService.setExecutionPublic(execution.id);
        toast.success("Execution successfully made public.");
      } else {
        await executionsService.setExecutionPrivate(execution.id);
        toast.success("Execution successfully made private.");
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

  if (
    isExecutionDetailsLoading ||
    isStructureOverallLoading ||
    isNodeTemplatesLoading
  ) {
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
                      to={`/share/executions/${executionId}`}
                      target="_blank"
                    >
                      <Share2 className="mr-1 h-4 w-4" />
                      Share
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleVisibility}
                  disabled={isVisibilityUpdating}
                  className="ml-0"
                >
                  {execution.visibility === "public" ? (
                    <EyeOff className="mr-1 h-4 w-4" />
                  ) : (
                    <Eye className="mr-1 h-4 w-4" />
                  )}
                  {execution.visibility === "public"
                    ? "Make Private"
                    : "Make Public"}
                </Button>
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
              nodeTemplates ? (
                <WorkflowBuilder
                  workflowId={execution.workflowId || execution.id}
                  initialNodes={reactFlowNodes}
                  initialEdges={reactFlowEdges}
                  nodeTemplates={nodeTemplates}
                  validateConnection={validateConnection}
                  initialWorkflowExecution={workflowBuilderExecution}
                  readonly={true}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-muted-foreground">
                    {isStructureOverallLoading || isNodeTemplatesLoading
                      ? "Loading workflow data..."
                      : "No workflow structure available or still loading components."}
                  </p>
                </div>
              )}
              {nodeTemplatesError && (
                <div className="absolute top-4 right-4 bg-amber-100 dark:bg-yellow-700 dark:text-yellow-100 px-3 py-1 rounded-md text-amber-800 text-sm">
                  {`Error loading node templates: ${nodeTemplatesError.message}`}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </InsetLayout>
  );
}
