import type {
  ObjectReference,
  WorkflowRuntime,
  WorkflowTrigger,
} from "@dafthunk/types";
import { ReactFlowProvider } from "@xyflow/react";
import Activity from "lucide-react/icons/activity";
import Building2 from "lucide-react/icons/building-2";
import { useCallback, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { useAdminWorkflowDetail } from "@/services/admin-service";
import { createAdminObjectUrl } from "@/services/object-service";
import {
  convertToReactFlowEdges,
  validateConnection,
} from "@/services/workflow-service";
import { formatDate } from "@/utils/date";

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
    <InsetLayout title="Workflow Details">
      <Card>
        <CardHeader>
          <CardTitle>{workflow.name}</CardTitle>
          {workflow.description && (
            <CardDescription>{workflow.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{workflow.trigger}</Badge>
            <Badge variant="outline">{workflow.runtime}</Badge>
            <Badge variant={workflow.enabled ? "default" : "secondary"}>
              {workflow.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Workflow ID</div>
              <div className="font-mono text-xs">{workflow.id}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Organization</div>
              <Link
                to={`/admin/organizations/${workflow.organizationId}`}
                className="text-primary hover:underline"
              >
                {workflow.organizationName}
              </Link>
            </div>
            <div>
              <div className="text-muted-foreground">Created</div>
              <div>{formatDate(workflow.createdAt)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Updated</div>
              <div>{formatDate(workflow.updatedAt)}</div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link
                to={`/admin/executions?workflowId=${workflow.id}&organizationId=${workflow.organizationId}`}
              >
                <Activity className="mr-2 h-4 w-4" />
                View executions
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/organizations/${workflow.organizationId}`}>
                <Building2 className="mr-2 h-4 w-4" />
                Open organization
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Structure</CardTitle>
          <CardDescription>
            Read-only view of the workflow graph. Drag to pan, scroll to zoom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] w-full rounded-md border overflow-hidden">
            <ReactFlowProvider>
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
            </ReactFlowProvider>
          </div>
        </CardContent>
      </Card>
    </InsetLayout>
  );
}
