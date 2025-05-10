import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { toast } from "sonner";
import { useNodeTemplates, usePublicExecutionDetails } from "@/hooks/use-fetch";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type {
  WorkflowExecution as WorkflowBuilderExecution,
  WorkflowNodeExecution,
} from "@/components/workflow/workflow-types";
import { workflowEdgeService } from "@/services/workflowEdgeService";
import type { NodeExecution, WorkflowExecution } from "@dafthunk/types";
import { InsetLoading } from "@/components/inset-loading";
import { InsetError } from "@/components/inset-error";
import { ExecutionStatusBadge } from "@/components/executions/execution-status-badge";

export function SharedExecutionPage() {
  const { executionId } = useParams<{ executionId: string }>();

  const {
    publicExecutionDetails: execution,
    publicExecutionDetailsError: error,
    isPublicExecutionDetailsLoading: isLoadingExecution,
  } = usePublicExecutionDetails(executionId);

  const { nodeTemplates, nodeTemplatesError, isNodeTemplatesLoading } =
    useNodeTemplates();

  const [reactFlowNodes, setReactFlowNodes] = useState<any[]>([]);
  const [reactFlowEdges, setReactFlowEdges] = useState<any[]>([]);

  useEffect(() => {
    if (nodeTemplatesError) {
      toast.error(
        `Failed to load node templates: ${nodeTemplatesError.message}`
      );
    }
  }, [nodeTemplatesError]);

  useEffect(() => {
    if (
      execution &&
      execution.nodes &&
      execution.edges &&
      execution.nodeExecutions
    ) {
      const execMap = new Map<string, NodeExecution>();
      for (const n of execution.nodeExecutions || []) execMap.set(n.nodeId, n);

      const rNodes = (execution.nodes || []).map((node: any) => ({
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
        workflowEdgeService.convertToReactFlowEdges(execution.edges || [])
      );
      setReactFlowEdges(rEdges);
    } else {
      setReactFlowNodes([]);
      setReactFlowEdges([]);
    }
  }, [execution]);

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

  const validateConnection = () => false; // Read-only

  if (isLoadingExecution || isNodeTemplatesLoading) {
    return <InsetLoading title="Execution" />;
  } else if (error) {
    return <InsetError title="Execution" errorMessage={error.message} />;
  }

  if (!execution) {
    return <InsetError title="Execution" errorMessage="Execution Not Found" />;
  }

  return (
    <InsetLayout
      title={`Execution: ${execution.workflowName || execution.id}`}
      titleRight={<ExecutionStatusBadge status={execution.status} />}
      className="overflow-hidden relative h-full"
      titleClassName="relative mb-0"
      childrenClassName="h-full w-full p-0"
    >
      <WorkflowBuilder
        workflowId={execution.workflowId || execution.id}
        initialNodes={reactFlowNodes}
        initialEdges={reactFlowEdges}
        nodeTemplates={nodeTemplates}
        validateConnection={validateConnection}
        initialWorkflowExecution={workflowBuilderExecution || undefined}
        readonly={true}
      />
    </InsetLayout>
  );
}
