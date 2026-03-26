import type {
  WorkflowRuntime,
  WorkflowTrigger,
  WorkflowWithMetadata,
} from "@dafthunk/types";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetLoading } from "@/components/inset-loading";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { WorkflowError } from "@/components/workflow/workflow-error";
import type { WorkflowExecution } from "@/components/workflow/workflow-types";
import { useEditableWorkflow } from "@/hooks/use-editable-workflow";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useObjectService } from "@/services/object-service";
import { useNodeTypes } from "@/services/type-service";
import { getWorkflow, setWorkflowEnabled } from "@/services/workflow-service";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgId = organization?.id || "";
  const { getOrgUrl } = useOrgUrl();

  const [httpWorkflowMetadata, setHttpWorkflowMetadata] =
    useState<WorkflowWithMetadata | null>(null);

  const [isEnabled, setIsEnabled] = useState(true);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);

  const handleToggleEnabled = useCallback(
    async (checked: boolean) => {
      if (!id || !orgId) return;
      setIsTogglingEnabled(true);
      try {
        await setWorkflowEnabled(id, checked, orgId);
        setIsEnabled(checked);
        toast.success(checked ? "Workflow enabled" : "Workflow disabled");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update workflow"
        );
      } finally {
        setIsTogglingEnabled(false);
      }
    },
    [id, orgId]
  );

  const { nodeTypes, nodeTypesError, isNodeTypesLoading } = useNodeTypes({
    revalidateOnFocus: false,
  });

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
    isWSConnected: _isWSConnected,
    workflowMetadata,
    handleNodesChange,
    handleEdgesChange,
    executeWorkflow: wsExecuteWorkflow,
    updateMetadata: wsUpdateMetadata,
    sendHumanInput: wsSendHumanInput,
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

  // Fetch workflow metadata via HTTP (for description and other metadata)
  useEffect(() => {
    const fetchWorkflowMetadata = async () => {
      if (!id || !orgId) return;
      try {
        const metadata = await getWorkflow(id, orgId);
        setHttpWorkflowMetadata(metadata);
        setIsEnabled(metadata.enabled === true);
      } catch (error) {
        console.error("Failed to fetch workflow metadata:", error);
      }
    };
    fetchWorkflowMetadata();
  }, [id, orgId]);

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
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            executeWorkflow={executeWorkflowWrapper}
            initialWorkflowExecution={latestExecution || undefined}
            createObjectUrl={createObjectUrl}
            workflowName={
              httpWorkflowMetadata?.name || workflowMetadata?.name || ""
            }
            workflowDescription={httpWorkflowMetadata?.description}
            onWorkflowUpdate={handleWorkflowUpdate}
            orgId={orgId}
            wsExecuteWorkflow={wsExecuteWorkflow}
            sendHumanInput={wsSendHumanInput}
            isEnabled={isEnabled}
            isTogglingEnabled={isTogglingEnabled}
            onToggleEnabled={handleToggleEnabled}
          />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
