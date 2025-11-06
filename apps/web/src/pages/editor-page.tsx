import type { WorkflowType, WorkflowWithMetadata } from "@dafthunk/types";
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
import {
  getWorkflow,
  updateWorkflow,
  useCronTrigger,
} from "@/services/workflow-service";

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

  // Store the callback from WorkflowBuilder to forward execution updates
  const executionCallbackRef = useRef<
    ((execution: WorkflowExecution) => void) | null
  >(null);

  const handleExecutionUpdate = useCallback((execution: WorkflowExecution) => {
    if (executionCallbackRef.current) {
      executionCallbackRef.current(execution);
    }
  }, []);

  const {
    nodes: initialNodesForUI,
    edges: initialEdgesForUI,
    isInitializing: isWorkflowInitializing,
    savingError: workflowSavingError,
    connectionError: workflowConnectionError,
    saveWorkflow,
    isWSConnected: _isWSConnected,
    workflowMetadata,
    executeWorkflow: wsExecuteWorkflow,
  } = useEditableWorkflow({
    workflowId: id,
    nodeTypes: nodeTypes || [],
    onExecutionUpdate: handleExecutionUpdate,
  });

  // Wrapper to convert wsExecuteWorkflow to the expected executeWorkflow signature
  const executeWorkflowWrapper = useCallback(
    (
      _workflowId: string,
      onExecution: (execution: WorkflowExecution) => void,
      triggerData?: unknown
    ) => {
      // Store the callback so we can forward execution updates
      executionCallbackRef.current = onExecution;

      if (wsExecuteWorkflow) {
        wsExecuteWorkflow({
          parameters: triggerData
            ? (triggerData as Record<string, unknown>)
            : undefined,
        });
      }
      return undefined;
    },
    [wsExecuteWorkflow]
  );

  // Now we can use workflowMetadata for cron trigger
  const { cronTrigger, isCronTriggerLoading, mutateCronTrigger } =
    useCronTrigger(workflowMetadata?.type === "cron" && id ? id : null, {
      revalidateOnFocus: false,
    });

  const {
    deployments: deploymentHistory,
    isDeploymentHistoryLoading,
    mutateHistory: mutateDeploymentHistory,
  } = useDeploymentHistory(id!, { revalidateOnFocus: false });

  const deploymentVersions = useMemo(
    () => deploymentHistory.map((d) => d.version).sort((a, b) => b - a),
    [deploymentHistory]
  );

  // Use refs for both nodes and edges to avoid stale closures and unnecessary re-renders
  // Both are only used for validation, execution, and saving - no UI rendering depends on them
  const latestUiNodesRef = useRef<Node<WorkflowNodeType>[]>([]);
  const latestUiEdgesRef = useRef<Edge<WorkflowEdgeType>[]>([]);

  useEffect(() => {
    if (initialNodesForUI) {
      latestUiNodesRef.current = initialNodesForUI;
    }
  }, [initialNodesForUI]);

  useEffect(() => {
    if (initialEdgesForUI) {
      latestUiEdgesRef.current = initialEdgesForUI;
    }
  }, [initialEdgesForUI]);

  const handleUiNodesChanged = useCallback(
    (updatedNodesFromUI: Node<WorkflowNodeType>[]) => {
      latestUiNodesRef.current = updatedNodesFromUI;
      if (workflowMetadata) {
        // Use refs for both to get current values without stale closures
        saveWorkflow(updatedNodesFromUI, latestUiEdgesRef.current);
      }
    },
    [saveWorkflow, workflowMetadata]
  );

  const handleUiEdgesChanged = useCallback(
    (updatedEdgesFromUI: Edge<WorkflowEdgeType>[]) => {
      latestUiEdgesRef.current = updatedEdgesFromUI;
      if (workflowMetadata) {
        // Use refs for both to get current values without stale closures
        saveWorkflow(latestUiNodesRef.current, updatedEdgesFromUI);
      }
    },
    [saveWorkflow, workflowMetadata]
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

  const validateConnection = useCallback(
    (connection: Connection) => {
      const sourceNode = latestUiNodesRef.current.find(
        (node) => node.id === connection.source
      );
      const targetNode = latestUiNodesRef.current.find(
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

      // Define blob-compatible types
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

      const typesMatch = exactMatch || anyTypeMatch || blobCompatible;

      return typesMatch;
    },
    [] // No dependencies since we're using refs
  );

  const handleWorkflowUpdate = useCallback(
    async (name: string, description?: string) => {
      if (!id || !orgHandle || !workflowMetadata) return;

      try {
        const fullWorkflow = await getWorkflow(id, orgHandle);
        await updateWorkflow(
          id,
          {
            name,
            description,
            type: fullWorkflow.type,
            nodes: fullWorkflow.nodes,
            edges: fullWorkflow.edges,
          },
          orgHandle
        );

        // Refresh HTTP metadata to get updated description
        const updatedMetadata = await getWorkflow(id, orgHandle);
        setHttpWorkflowMetadata(updatedMetadata);
      } catch (error) {
        console.error("Error updating workflow metadata:", error);
        toast.error("Failed to update workflow metadata");
      }
    },
    [id, orgHandle, workflowMetadata]
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

  if (nodeTypesError) {
    return (
      <WorkflowError
        message={nodeTypesError.message || "Failed to load node types."}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (workflowSavingError) {
    toast.error(`Workflow saving error: ${workflowSavingError}`);
  }

  if (workflowConnectionError) {
    toast.error(`Connection error: ${workflowConnectionError}`);
  }

  if (
    isNodeTypesLoading ||
    isWorkflowInitializing ||
    isCronTriggerLoading ||
    isDeploymentHistoryLoading
  ) {
    return <InsetLoading />;
  }

  if (
    !workflowMetadata &&
    !isNodeTypesLoading &&
    !nodeTypesError &&
    !isWorkflowInitializing
  ) {
    return (
      <WorkflowError
        message={`Workflow with ID "${id}" not found, or could not be loaded via WebSocket.`}
        onRetry={() => navigate(getOrgUrl("workflows"))}
      />
    );
  }

  if (!initialNodesForUI || !initialEdgesForUI) {
    return <InsetLoading />;
  }

  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex flex-col relative">
        <div className="h-full w-full flex-grow">
          <WorkflowBuilder
            workflowId={id || ""}
            workflowType={workflowMetadata?.type as WorkflowType | undefined}
            initialNodes={initialNodesForUI}
            initialEdges={initialEdgesForUI}
            nodeTypes={nodeTypes || []}
            onNodesChange={handleUiNodesChanged}
            onEdgesChange={handleUiEdgesChanged}
            validateConnection={validateConnection}
            executeWorkflow={executeWorkflowWrapper}
            onDeployWorkflow={handleDeployWorkflow}
            createObjectUrl={createObjectUrl}
            workflowName={
              httpWorkflowMetadata?.name || workflowMetadata?.name || ""
            }
            workflowDescription={httpWorkflowMetadata?.description}
            onWorkflowUpdate={handleWorkflowUpdate}
            orgHandle={orgHandle}
            cronTrigger={cronTrigger}
            mutateCronTrigger={mutateCronTrigger}
            deploymentVersions={deploymentVersions}
            mutateDeploymentHistory={mutateDeploymentHistory}
            wsExecuteWorkflow={wsExecuteWorkflow}
          />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
