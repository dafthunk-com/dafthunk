import type { NodeExecution, WorkflowExecution } from "@dafthunk/types";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { ExecutionStatusBadge } from "@/components/executions/execution-status-badge";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { AppLayout } from "@/components/layouts/app-layout";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { MetaHead } from "@/components/meta-head";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type {
  WorkflowExecution as WorkflowBuilderExecution,
  WorkflowNodeExecution,
} from "@/components/workflow/workflow-types";
import { API_BASE_URL } from "@/config/api";
import { usePublicExecution } from "@/services/execution-service";
import { createPublicObjectUrl } from "@/services/object-service";
import {
  convertToReactFlowEdges,
  validateConnection,
} from "@/services/workflow-service";

export function PublicExecutionPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const [searchParams] = useSearchParams();
  const fullscreen = searchParams.has("fullscreen");

  const {
    publicExecution: execution,
    publicExecutionError: error,
    isPublicExecutionLoading: isLoadingExecution,
  } = usePublicExecution(executionId || null);

  // Use empty node templates array since we're in readonly mode
  const nodeTemplates = [];

  const [reactFlowNodes, setReactFlowNodes] = useState<any[]>([]);
  const [reactFlowEdges, setReactFlowEdges] = useState<any[]>([]);

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

      const rEdges = Array.from(convertToReactFlowEdges(execution.edges || []));
      setReactFlowEdges(rEdges);
    } else {
      setReactFlowNodes([]);
      setReactFlowEdges([]);
    }
  }, [execution]);

  const handleValidateConnection = useMemo(
    () => (connection: any) =>
      validateConnection(connection, reactFlowEdges).status === "valid",
    [reactFlowEdges]
  );

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

  if (isLoadingExecution) {
    return (
      <div className="h-screen w-screen">
        <InsetLoading />
      </div>
    );
  } else if (error) {
    return (
      <AppLayout>
        <InsetError title="Execution" errorMessage={error.message} />
      </AppLayout>
    );
  }

  if (!execution) {
    return (
      <AppLayout>
        <InsetError title="Execution" errorMessage="Execution Not Found" />
      </AppLayout>
    );
  }

  const pageTitle = execution
    ? `Execution: ${execution.workflowName || execution.id}`
    : "Shared Execution";

  const pageDescription = execution
    ? `Details for workflow execution: ${execution.workflowName || execution.id}`
    : "View the details of a shared workflow execution.";

  const ogImageUrl = executionId
    ? `${API_BASE_URL}/public/images/og-execution-${executionId}.jpeg`
    : "";

  const ogUrl = executionId
    ? `${window.location.origin}/public/executions/${executionId}`
    : window.location.href;

  const metaTags = [
    {
      name: "description",
      content: pageDescription,
    },
    {
      property: "og:image",
      content: ogImageUrl,
    },
    { property: "og:type", content: "website" },
    {
      property: "og:url",
      content: ogUrl,
    },
    {
      property: "og:title",
      content: pageTitle,
    },
    {
      property: "og:description",
      content: pageDescription,
    },
    { property: "twitter:card", content: "summary_large_image" },
    {
      property: "twitter:url",
      content: ogUrl,
    },
    {
      property: "twitter:title",
      content: pageTitle,
    },
    {
      property: "twitter:description",
      content: pageDescription,
    },
    {
      property: "twitter:image",
      content: ogImageUrl,
    },
  ];

  return fullscreen ? (
    <div className="h-screen w-screen relative">
      <WorkflowBuilder
        workflowId={execution.workflowId || execution.id}
        initialNodes={reactFlowNodes}
        initialEdges={reactFlowEdges}
        nodeTemplates={nodeTemplates}
        validateConnection={handleValidateConnection}
        initialWorkflowExecution={workflowBuilderExecution || undefined}
        readonly={true}
        expandedOutputs={true}
        createObjectUrl={createPublicObjectUrl}
      />
    </div>
  ) : (
    <AppLayout>
      <MetaHead
        title={
          execution
            ? `Execution: ${execution.workflowName || execution.id}`
            : "Shared Execution"
        }
        tags={metaTags}
      />
      <InsetLayout
        title={
          execution
            ? `Execution: ${execution.workflowName || execution.id}`
            : "Shared Execution"
        }
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
          validateConnection={handleValidateConnection}
          initialWorkflowExecution={workflowBuilderExecution || undefined}
          readonly={true}
          expandedOutputs={true}
          createObjectUrl={createPublicObjectUrl}
        />
      </InsetLayout>
    </AppLayout>
  );
}
