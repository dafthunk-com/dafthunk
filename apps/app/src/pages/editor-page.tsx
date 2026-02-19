import type {
  WorkflowRuntime,
  WorkflowTrigger,
  WorkflowWithMetadata,
} from "@dafthunk/types";
import type { Connection, Edge, Node } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetLoading } from "@/components/inset-loading";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { WorkflowError } from "@/components/workflow/workflow-error";
import type {
  WorkflowEdgeType,
  WorkflowExecution,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";
import { useEditableWorkflow } from "@/hooks/use-editable-workflow";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createDeployment,
  useDeploymentHistory,
} from "@/services/deployment-service";
import { useObjectService } from "@/services/object-service";
import { useNodeTypes } from "@/services/type-service";
import { getWorkflow } from "@/services/workflow-service";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";
  const { getOrgUrl } = useOrgUrl();

  const [httpWorkflowMetadata, setHttpWorkflowMetadata] =
    useState<WorkflowWithMetadata | null>(null);

  // Fetch all node types initially (no filter)
  const { nodeTypes, nodeTypesError, isNodeTypesLoading } = useNodeTypes(
    undefined, // Fetch all node types initially
    { revalidateOnFocus: false }
  );

  const { createObjectUrl } = useObjectService();

  const executionCallbackRef = useRef<
    ((execution: WorkflowExecution) => void) | null
  >(null);

  // Track the latest execution for scheduled workflows
  const [latestExecution, setLatestExecution] =
    useState<WorkflowExecution | null>(null);

  const {
    nodes: initialNodesForUI,
    edges: initialEdgesForUI,
    isInitializing: isWorkflowInitializing,
    savingError: workflowSavingError,
    connectionError: workflowConnectionError,
    saveWorkflow,
    isWSConnected: _isWSConnected,
    isRemoteUpdateRef,
    workflowMetadata,
    executeWorkflow: wsExecuteWorkflow,
    updateMetadata: wsUpdateMetadata,
  } = useEditableWorkflow({
    workflowId: id,
    nodeTypes: nodeTypes || [],
    onExecutionUpdate: (execution) => {
      // Try to call the callback ref (for UI-triggered executions)
      if (executionCallbackRef.current) {
        executionCallbackRef.current(execution);
      } else {
        // For scheduled workflows or other backend-triggered executions,
        // update state so WorkflowBuilder can receive it
        setLatestExecution(execution);
      }
    },
  });

  const executeWorkflowWrapper = useCallback(
    (
      _workflowId: string,
      onExecution: (execution: WorkflowExecution) => void,
      triggerData?: unknown
    ) => {
      executionCallbackRef.current = onExecution;
      wsExecuteWorkflow?.({
        parameters: triggerData as Record<string, unknown> | undefined,
      });

      // Return a cleanup function that clears the ref
      return () => {
        executionCallbackRef.current = null;
      };
    },
    [wsExecuteWorkflow]
  );

  const {
    deployments: deploymentHistory,
    isDeploymentHistoryLoading,
    mutateHistory: mutateDeploymentHistory,
  } = useDeploymentHistory(id!, { revalidateOnFocus: false });

  const deploymentVersions = useMemo(
    () => deploymentHistory.map((d) => d.version).sort((a, b) => b - a),
    [deploymentHistory]
  );

  const nodesRef = useRef<Node<WorkflowNodeType>[]>([]);
  const edgesRef = useRef<Edge<WorkflowEdgeType>[]>([]);

  nodesRef.current = initialNodesForUI || [];
  edgesRef.current = initialEdgesForUI || [];

  const handleUiNodesChanged = useCallback(
    (nodes: Node<WorkflowNodeType>[]) => {
      nodesRef.current = nodes;
      if (workflowMetadata && !isRemoteUpdateRef.current) {
        saveWorkflow(nodes, edgesRef.current);
      }
    },
    [saveWorkflow, workflowMetadata, isRemoteUpdateRef]
  );

  const handleUiEdgesChanged = useCallback(
    (edges: Edge<WorkflowEdgeType>[]) => {
      edgesRef.current = edges;
      if (workflowMetadata && !isRemoteUpdateRef.current) {
        saveWorkflow(nodesRef.current, edges);
      }
    },
    [saveWorkflow, workflowMetadata, isRemoteUpdateRef]
  );

  // Fetch workflow metadata via HTTP (for description and other metadata)
  useEffect(() => {
    const fetchWorkflowMetadata = async () => {
      if (!id || !orgHandle) return;
      try {
        const metadata = await getWorkflow(id, orgHandle);
        setHttpWorkflowMetadata(metadata);
      } catch (error) {
        console.error("Failed to fetch workflow metadata:", error);
      }
    };
    fetchWorkflowMetadata();
  }, [id, orgHandle]);

  usePageBreadcrumbs(
    [
      { label: "Workflows", to: getOrgUrl("workflows") },
      {
        label:
          httpWorkflowMetadata?.name || workflowMetadata?.name || "Workflow",
      },
    ],
    [httpWorkflowMetadata?.name, workflowMetadata?.name]
  );

  const validateConnection = useCallback((connection: Connection) => {
    const sourceNode = nodesRef.current.find(
      (node) => node.id === connection.source
    );
    const targetNode = nodesRef.current.find(
      (node) => node.id === connection.target
    );
    if (!sourceNode || !targetNode) return false;

    const sourceOutput = sourceNode.data.outputs.find(
      (output) => output.id === connection.sourceHandle
    );
    const targetInput = targetNode.data.inputs.find(
      (input) => input.id === connection.targetHandle
    );
    if (!sourceOutput || !targetInput) return false;

    const blobTypes = new Set([
      "image",
      "audio",
      "document",
      "buffergeometry",
      "gltf",
    ]);

    const exactMatch = sourceOutput.type === targetInput.type;
    const anyTypeMatch =
      sourceOutput.type === "any" || targetInput.type === "any";
    const blobCompatible =
      (sourceOutput.type === "blob" && blobTypes.has(targetInput.type)) ||
      (targetInput.type === "blob" && blobTypes.has(sourceOutput.type));

    return exactMatch || anyTypeMatch || blobCompatible;
  }, []);

  const handleWorkflowUpdate = useCallback(
    (
      name: string,
      description?: string,
      trigger?: WorkflowTrigger,
      runtime?: WorkflowRuntime
    ) => {
      if (!id) return;

      // Update via WebSocket - this updates the session state and persists to D1/R2
      wsUpdateMetadata?.({
        name,
        description,
        trigger,
        runtime,
      });
    },
    [id, wsUpdateMetadata]
  );

  const handleDeployWorkflow = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!id || !orgHandle) return;

      try {
        await createDeployment(id, orgHandle);
        toast.success("Workflow deployed successfully");
      } catch (error) {
        console.error("Error deploying workflow:", error);
        toast.error("Failed to deploy workflow. Please try again.");
      }
    },
    [id, orgHandle]
  );

  useEffect(() => {
    if (workflowSavingError) {
      toast.error(`Workflow saving error: ${workflowSavingError}`);
    }
  }, [workflowSavingError]);

  useEffect(() => {
    if (workflowConnectionError) {
      toast.error(`Connection error: ${workflowConnectionError}`);
    }
  }, [workflowConnectionError]);

  if (nodeTypesError) {
    return (
      <WorkflowError
        message={nodeTypesError.message || "Failed to load node types."}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const isLoading =
    isNodeTypesLoading ||
    isWorkflowInitializing ||
    isDeploymentHistoryLoading ||
    !initialNodesForUI ||
    !initialEdgesForUI;

  if (isLoading) {
    return <InsetLoading />;
  }

  if (!workflowMetadata) {
    return (
      <WorkflowError
        message={`Workflow with ID "${id}" not found, or could not be loaded via WebSocket.`}
        onRetry={() => navigate(getOrgUrl("workflows"))}
      />
    );
  }

  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex flex-col relative">
        <div className="h-full w-full flex-grow">
          <WorkflowBuilder
            workflowId={id || ""}
            workflowTrigger={
              (httpWorkflowMetadata?.trigger || workflowMetadata?.trigger) as
                | WorkflowTrigger
                | undefined
            }
            workflowRuntime={
              httpWorkflowMetadata?.runtime || workflowMetadata?.runtime
            }
            initialNodes={initialNodesForUI}
            initialEdges={initialEdgesForUI}
            nodeTypes={nodeTypes || []}
            onNodesChange={handleUiNodesChanged}
            onEdgesChange={handleUiEdgesChanged}
            validateConnection={validateConnection}
            executeWorkflow={executeWorkflowWrapper}
            initialWorkflowExecution={latestExecution || undefined}
            onDeployWorkflow={handleDeployWorkflow}
            createObjectUrl={createObjectUrl}
            workflowName={
              httpWorkflowMetadata?.name || workflowMetadata?.name || ""
            }
            workflowDescription={httpWorkflowMetadata?.description}
            onWorkflowUpdate={handleWorkflowUpdate}
            orgHandle={orgHandle}
            deploymentVersions={deploymentVersions}
            mutateDeploymentHistory={mutateDeploymentHistory}
            wsExecuteWorkflow={wsExecuteWorkflow}
          />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
