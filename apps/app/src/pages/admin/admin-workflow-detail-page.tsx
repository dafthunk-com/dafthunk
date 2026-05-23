import type {
  ObjectReference,
  WorkflowRuntime,
  WorkflowTrigger,
} from "@dafthunk/types";
import { ReactFlowProvider } from "@xyflow/react";
import Building2 from "lucide-react/icons/building-2";
import Hash from "lucide-react/icons/hash";
import PlayCircle from "lucide-react/icons/play-circle";
import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router";

import { AdminDetailContextBar } from "@/components/admin/admin-detail-context-bar";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { useAdminWorkflowDetail } from "@/services/admin-service";
import { createAdminObjectUrl } from "@/services/object-service";
import {
  convertToReactFlowEdges,
  validateConnection,
} from "@/services/workflow-service";

export function AdminWorkflowDetailPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { workflow, workflowError, isWorkflowLoading } =
    useAdminWorkflowDetail(workflowId);
  const setBreadcrumbs = useBreadcrumbsSetter();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Workflows", to: "/admin/workflows" },
      { label: workflow?.name || "Workflow Details" },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, workflow?.name]);

  // Workflows don't carry execution outputs, but WorkflowBuilder always
  // requires createObjectUrl. Scope to the workflow's org so any node
  // referencing a static blob can still resolve.
  const orgId = workflow?.organizationId ?? "";
  const createObjectUrl = useCallback(
    (objectReference: ObjectReference) =>
      createAdminObjectUrl(objectReference, orgId),
    [orgId]
  );

  // Convert raw nodes/edges into the shape WorkflowBuilder expects. No
  // execution overlay — all outputs are undefined / executionState idle.
  const { reactFlowNodes, reactFlowEdges } = useMemo(() => {
    if (!workflow) {
      return { reactFlowNodes: [], reactFlowEdges: [] };
    }
    const nodes = workflow.nodes.map((node: any) => ({
      id: node.id,
      type: "workflowNode",
      position: node.position,
      data: {
        name: node.name,
        inputs: (node.inputs || []).map((input: any) => ({
          id: input.name,
          type: input.type,
          name: input.name,
          value: input.value,
          hidden: input.hidden,
          required: input.required,
          repeated: input.repeated,
        })),
        outputs: (node.outputs || []).map((output: any) => ({
          id: output.name,
          type: output.type,
          name: output.name,
          hidden: output.hidden,
          repeated: output.repeated,
        })),
        executionState: "idle" as const,
        nodeType: node.type,
        icon: node.icon,
      },
    }));
    const edges = Array.from(convertToReactFlowEdges(workflow.edges));
    return { reactFlowNodes: nodes, reactFlowEdges: edges };
  }, [workflow]);

  const handleValidateConnection = useMemo(
    () => (connection: any) =>
      validateConnection(connection, reactFlowEdges).status === "valid",
    [reactFlowEdges]
  );

  if (isWorkflowLoading) {
    return <InsetLoading title="Workflow Details" />;
  }

  if (workflowError) {
    return (
      <InsetError
        title="Workflow Details"
        errorMessage={workflowError.message}
      />
    );
  }

  if (!workflow) {
    return (
      <InsetError title="Workflow Details" errorMessage="Workflow not found" />
    );
  }

  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex flex-col relative">
        <AdminDetailContextBar
          items={[
            {
              icon: Building2,
              label: workflow.organizationName,
              to: `/admin/organizations/${workflow.organizationId}`,
            },
            {
              icon: PlayCircle,
              label: "View executions",
              to: `/admin/executions?workflowId=${workflow.id}&organizationId=${workflow.organizationId}`,
            },
            {
              icon: Hash,
              label: workflow.id,
              mono: true,
            },
          ]}
        />
        <div className="w-full grow min-h-0">
          <WorkflowBuilder
            workflowId={workflow.id}
            workflowName={workflow.name}
            workflowDescription={workflow.description ?? undefined}
            workflowTrigger={workflow.trigger as WorkflowTrigger}
            workflowRuntime={workflow.runtime as WorkflowRuntime}
            initialNodes={reactFlowNodes}
            initialEdges={reactFlowEdges}
            nodeTypes={[]}
            validateConnection={handleValidateConnection}
            createObjectUrl={createObjectUrl}
            mode="readonly"
            disabledFeedback={true}
            orgId={workflow.organizationId}
          />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
