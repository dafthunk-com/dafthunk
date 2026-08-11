import type {
  WorkflowRuntime,
  WorkflowTrigger,
  WorkflowWithMetadata,
} from "@dafthunk/types";
import { ReactFlowProvider } from "@xyflow/react";
import MapIcon from "lucide-react/icons/map";
import MessageCircle from "lucide-react/icons/message-circle";
import Pencil from "lucide-react/icons/pencil";
import WorkflowIcon from "lucide-react/icons/workflow";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetLoading } from "@/components/inset-loading";
import {
  ActionBarButton,
  ActionBarGroup,
  actionBarButtonActiveClassName,
  actionBarButtonOutlineClassName,
} from "@/components/ui/action-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DescribeMode } from "@/components/workflow/describe-mode";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { WorkflowError } from "@/components/workflow/workflow-error";
import type {
  WorkflowExecution,
  WorkflowNodeExecution,
} from "@/components/workflow/workflow-types";
import { useEditableWorkflow } from "@/hooks/use-editable-workflow";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useWorkflowBrief } from "@/hooks/use-workflow-brief";
import { useExecution } from "@/services/execution-service";
import { useObjectService } from "@/services/object-service";
import { useNodeTypes } from "@/services/type-service";
import { getWorkflow, setWorkflowEnabled } from "@/services/workflow-service";

/** How the workflow gets changed: described to the agent, or edited by hand. */
type WorkflowPageMode = "describe" | "edit";

/**
 * How closely the workflow is being looked at: schematic pills, or the full
 * wiring. Deliberately its own axis — flipping who holds the pen must never
 * change the zoom, and vice versa.
 */
type WorkflowPageView = "overview" | "wiring";

/** One option of a two-way axis switch: an icon, a tooltip, a predicate. */
function AxisButton({
  active,
  tooltip,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  tooltip: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <ActionBarButton
      onClick={onClick}
      disabled={disabled}
      className={
        active
          ? actionBarButtonActiveClassName
          : actionBarButtonOutlineClassName
      }
      tooltip={tooltip}
      tooltipSide="bottom"
    >
      {children}
    </ActionBarButton>
  );
}

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const orgId = organization?.id || "";
  const { getOrgUrl } = useOrgUrl();

  // ── Modes ───────────────────────────────────────────────────────────────
  // Describe: the conversation rail beside the pill schematic — say what
  // should change, the agent rebuilds. Edit: the detail canvas with the
  // properties sidebar — change it by hand. Developer-gated like the
  // generator itself; for everyone else the param silently reads as Edit.
  const isDeveloperMode = user?.developerMode ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: WorkflowPageMode =
    isDeveloperMode && searchParams.get("mode") === "describe"
      ? "describe"
      : "edit";

  // Both axes live in the URL; setting one is "set or drop a param". The
  // default (Edit, wiring) is the absent param, so plain workflow links stay
  // clean.
  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          if (value) params.set(key, value);
          else params.delete(key);
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setMode = useCallback(
    (next: WorkflowPageMode) =>
      setParam("mode", next === "describe" ? "describe" : null),
    [setParam]
  );

  // The generation socket is paid for lazily — a connect costs a rate-limit
  // slot — but once Describe mode has been visited the session stays
  // attached across flips, so toggling is free and the conversation keeps
  // its continuity. A render-phase state latch, the sanctioned form: an
  // effect would connect a commit late.
  const [describeVisited, setDescribeVisited] = useState(mode === "describe");
  if (mode === "describe" && !describeVisited) setDescribeVisited(true);
  const brief = useWorkflowBrief(orgId, {
    sessionId: describeVisited && id ? id : undefined,
  });

  // Hand edits mid-turn would be clobbered by the turn's save, and a parked
  // approval question must be answered where it was asked.
  const generationBusy =
    brief.state.status === "running" ||
    (brief.state.pendingActions?.length ?? 0) > 0;

  // ── View ────────────────────────────────────────────────────────────────
  // The other axis, owned here so both surfaces show the same zoom and a
  // mode flip never changes it. The brief page's "Open it" arrives with
  // ?mode=describe&view=overview — the picture the user just watched.
  const view: WorkflowPageView =
    searchParams.get("view") === "overview" ? "overview" : "wiring";

  const setView = useCallback(
    (next: WorkflowPageView) =>
      setParam("view", next === "overview" ? "overview" : null),
    [setParam]
  );

  // The trial run's execution id rides the handoff so a flip to Edit mode
  // still gets the verdict stamps.
  const { execution: handedOffExecution } = useExecution(
    searchParams.get("executionId")
  );

  const handedOffBuilderExecution = useMemo<
    WorkflowExecution | undefined
  >(() => {
    if (!handedOffExecution) return undefined;
    return {
      id: handedOffExecution.id,
      status: handedOffExecution.status as WorkflowExecution["status"],
      nodeExecutions: (handedOffExecution.nodeExecutions || []).map(
        (nodeExecution): WorkflowNodeExecution => ({
          nodeId: nodeExecution.nodeId,
          status: nodeExecution.status as WorkflowNodeExecution["status"],
          outputs: nodeExecution.outputs || {},
          error: nodeExecution.error,
        })
      ),
    };
  }, [handedOffExecution]);

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
    workflowState,
    handleNodesChange,
    handleEdgesChange,
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

  // Two switches, two axes, side by side so their independence reads: which
  // way you change this workflow (describe it, or edit it by hand), and how
  // closely you look at it (pills, or wiring). Handed to whichever surface
  // is showing, which centers it over its own canvas — page-center lands
  // visibly off once a rail or sidebar shares the row. The mode pair is
  // developer-only while the generator is gated; the view pair is for
  // everyone. Only the Edit interaction locks during a turn — the zoom
  // stays free.
  const axisControls = (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {isDeveloperMode && (
          <ActionBarGroup>
            <AxisButton
              active={mode === "describe"}
              onClick={() => setMode("describe")}
              tooltip="Describe your changes to the agent"
            >
              <MessageCircle className="size-4!" />
            </AxisButton>
            <AxisButton
              active={mode === "edit"}
              onClick={() => setMode("edit")}
              disabled={mode === "describe" && generationBusy}
              tooltip={
                mode === "describe" && generationBusy
                  ? "The agent is working on it"
                  : "Edit the workflow by hand"
              }
            >
              <Pencil className="size-4!" />
            </AxisButton>
          </ActionBarGroup>
        )}
        <ActionBarGroup>
          <AxisButton
            active={view === "overview"}
            onClick={() => setView("overview")}
            tooltip="See the workflow at a glance"
          >
            <MapIcon className="size-4!" />
          </AxisButton>
          <AxisButton
            active={view === "wiring"}
            onClick={() => setView("wiring")}
            tooltip="See the full wiring"
          >
            <WorkflowIcon className="size-4!" />
          </AxisButton>
        </ActionBarGroup>
      </div>
    </TooltipProvider>
  );

  return (
    <div className="relative h-full w-full">
      {mode === "describe" ? (
        <DescribeMode
          brief={brief}
          fallbackWorkflow={workflowState}
          workflowName={httpWorkflowMetadata?.name || workflowMetadata?.name}
          nodeTypes={nodeTypes}
          view={view}
          controls={axisControls}
          getOrgUrl={getOrgUrl}
        />
      ) : (
        <ReactFlowProvider>
          <div className="h-full w-full flex flex-col relative">
            <div className="h-full w-full grow">
              <WorkflowBuilder
                workflowId={id || ""}
                workflowTrigger={
                  (httpWorkflowMetadata?.trigger ||
                    workflowMetadata?.trigger) as WorkflowTrigger | undefined
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
                initialWorkflowExecution={
                  latestExecution || handedOffBuilderExecution
                }
                view={view === "overview" ? "overview" : "detail"}
                onViewChange={(next) =>
                  setView(next === "overview" ? "overview" : "wiring")
                }
                topCenterSlot={axisControls}
                createObjectUrl={createObjectUrl}
                workflowName={
                  httpWorkflowMetadata?.name || workflowMetadata?.name || ""
                }
                workflowDescription={httpWorkflowMetadata?.description}
                onWorkflowUpdate={handleWorkflowUpdate}
                orgId={orgId}
                wsExecuteWorkflow={wsExecuteWorkflow}
                isEnabled={isEnabled}
                isTogglingEnabled={isTogglingEnabled}
                onToggleEnabled={handleToggleEnabled}
              />
            </div>
          </div>
        </ReactFlowProvider>
      )}
    </div>
  );
}
