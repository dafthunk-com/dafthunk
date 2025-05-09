import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { toast } from "sonner";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useFetch } from "@/hooks/use-fetch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type {
  WorkflowExecution as WorkflowBuilderExecution,
  WorkflowNodeExecution,
} from "@/components/workflow/workflow-types";
import { workflowEdgeService } from "@/services/workflowEdgeService";
import type { NodeExecution, WorkflowExecution } from "@dafthunk/types";
import { ExecutionInfoCard } from "@/components/executions/execution-info-card";
import { PageLoading } from "@/components/page-loading";

export function ExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const {
    executionDetails: execution,
    executionDetailsError,
    isExecutionDetailsLoading,
  } = useFetch.useExecutionDetails(executionId);

  const { nodeTemplates, nodeTemplatesError, isNodeTemplatesLoading } =
    useFetch.useNodeTemplates();

  const { workflowDetails: workflowInfo } = useFetch.useWorkflowDetails(
    execution?.workflowId
  );

  const {
    deploymentVersion: deploymentStructureSource,
    isDeploymentVersionLoading: isDeploymentStructureLoading,
  } = useFetch.useDeploymentVersion(execution?.deploymentId);

  const {
    workflowDetails: workflowStructureSourceFromDetails,
    isWorkflowDetailsLoading: isWorkflowStructureDetailsLoading,
  } = useFetch.useWorkflowDetails(
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

  if (
    isExecutionDetailsLoading ||
    isStructureOverallLoading ||
    isNodeTemplatesLoading
  ) {
    return <PageLoading />;
  }

  if (executionDetailsError) {
    return (
      <InsetLayout title="Error">
        <div className="text-center py-10">
          <p className="text-lg text-destructive">Error loading execution.</p>
          <p className="text-sm text-muted-foreground">
            {executionDetailsError.message}
          </p>
        </div>
      </InsetLayout>
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
          <TabsList>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="visualization">Visualization</TabsTrigger>
          </TabsList>
          <TabsContent value="status" className="space-y-6 mt-4">
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
          <TabsContent value="visualization" className="mt-4">
            <div className="h-[calc(100vh-280px)] border rounded-md relative">
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
                <div className="absolute top-4 right-4 bg-amber-100 px-3 py-1 rounded-md text-amber-800 text-sm">
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
