import type { NodeType, WorkflowState } from "@dafthunk/types";
import Logs from "lucide-react/icons/logs";
import PanelRightClose from "lucide-react/icons/panel-right-close";
import PanelRightOpen from "lucide-react/icons/panel-right-open";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import {
  ConnectionBanner,
  ConversationRail,
  CritiqueForm,
  isRailScreen,
  railScreen,
  SessionSkeleton,
} from "@/components/brief/conversation-rail";
import {
  ConversationShell,
  EmptyCanvas,
} from "@/components/brief/conversation-shell";
import {
  ActionBarButton,
  ActionBarGroup,
  actionBarButtonOutlineClassName,
} from "@/components/ui/action-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { UseResizableSidebarReturn } from "@/components/workflow/use-resizable-sidebar";
import { WorkflowSchematicView } from "@/components/workflow/workflow-schematic-view";
import type { useWorkflowBrief } from "@/hooks/use-workflow-brief";
import { markOutcomeSeen } from "@/services/profile-service";

/**
 * The workflow page's Describe mode: the schematic on the canvas, the
 * conversation in the right sidebar — the same panel that holds the
 * properties inspector in Edit mode, toggled to different contents. This is
 * where every post-save screen of a generation session plays — /start hands
 * off here the moment a first version exists, so the approval gate, the
 * trial run, the outcome and the arm card all render on the workflow's own
 * page, whether the session was born on /start or adopted an existing
 * workflow.
 *
 * The voice follows provenance: a session whose state carries a brief is
 * the creation arc (its arm card says "It isn't running on its own yet");
 * an adopted session has no brief and speaks revision ("This change paused
 * its trigger").
 *
 * The canvas prefers the generation stream's own graph frames (they animate
 * the build in progress) and falls back to the editor socket's live state —
 * which is exactly what an adopted workflow shows before its first critique,
 * and stays fresh because generation saves broadcast to the editor socket.
 *
 * `ask` is deliberately absent: on a session that already has a workflow, a
 * fresh ask would regenerate it from scratch rather than revise it. The
 * critique box is the whole keyboard here.
 */
export function DescribeMode({
  brief,
  fallbackWorkflow,
  workflowName,
  nodeTypes,
  view,
  panel,
  controls,
  getOrgUrl,
}: {
  brief: ReturnType<typeof useWorkflowBrief>;
  /** The editor socket's live graph — the picture between conversations. */
  fallbackWorkflow: WorkflowState | null;
  workflowName?: string;
  nodeTypes?: NodeType[];
  /** The page-owned zoom level, shared with Edit mode. */
  view: "overview" | "wiring";
  /** The page-owned sidebar, shared with Edit mode: same width, same state. */
  panel: UseResizableSidebarReturn;
  /** The page's axis switches, centered over this mode's canvas pane. */
  controls?: React.ReactNode;
  getOrgUrl: (path: string) => string;
}) {
  const navigate = useNavigate();
  const { state, critique, cancel, reconnect, arm } = brief;
  // Kept after the box is cleared so the wait can show what was asked for.
  const [pendingNote, setPendingNote] = useState("");

  // The one critique entry point: sends the note and keeps it on screen as
  // the "Changing:" receipt while the rebuild runs.
  const critiqueAndRecord = (note: string) => {
    critique(note);
    setPendingNote(note);
  };

  // Whose arc this session is: a brief means it was born in conversation.
  const voice = state.brief ? "creation" : "revision";

  // Stamped once per session, when a result is actually on screen — moved
  // here with the outcome itself. Best-effort and deliberately unawaited:
  // this is observability, and a failed stamp must never be something the
  // user notices.
  const stampedOutcome = useRef(false);
  const hasOutcome = Boolean(state.execution && state.workflow);
  useEffect(() => {
    if (!hasOutcome || stampedOutcome.current) return;
    stampedOutcome.current = true;
    void markOutcomeSeen().catch(() => {});
  }, [hasOutcome]);

  const screen = railScreen(state);

  const workflow =
    (state.workflow && state.workflow.nodes.length > 0
      ? state.workflow
      : undefined) ?? fallbackWorkflow;

  // The canvas pane always exists here so the page's axis switches have a
  // surface to center on — centered on the pane, not the page, because the
  // sidebar shifts the pane's midpoint left of the viewport's.
  const canvas = (
    <div className="relative h-full">
      {workflow && workflow.nodes.length > 0 ? (
        <WorkflowSchematicView
          workflow={workflow}
          running={screen === "running" && state.phase === "running"}
          execution={screen === "outcome" ? state.execution : undefined}
          nodeTypes={nodeTypes}
          view={view}
          className="h-full"
        />
      ) : (
        <EmptyCanvas />
      )}
      {controls && (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
          {controls}
        </div>
      )}
      {/* The corner the editor keeps its controls: the trial run's full log
          one click away, and the panel toggle — the same button, icons and
          words as Edit mode's, because it collapses the same sidebar.
          Desktop-only by construction: on small screens the rail is the
          page, not a panel. */}
      <TooltipProvider>
        <div className="absolute right-4 top-4 z-10 flex items-center gap-3">
          {state.executionId && (
            <ActionBarGroup>
              <ActionBarButton
                onClick={() =>
                  navigate(getOrgUrl(`executions/${state.executionId}`))
                }
                className={actionBarButtonOutlineClassName}
                tooltipSide="bottom"
                tooltip="See the full run"
              >
                <Logs className="size-4!" />
              </ActionBarButton>
            </ActionBarGroup>
          )}
          <div className="hidden lg:block">
            <ActionBarGroup>
              <ActionBarButton
                onClick={panel.toggleSidebar}
                className={actionBarButtonOutlineClassName}
                tooltipSide="bottom"
                tooltip={
                  panel.isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"
                }
              >
                {panel.isSidebarVisible ? (
                  <PanelRightClose className="size-4!" />
                ) : (
                  <PanelRightOpen className="size-4!" />
                )}
              </ActionBarButton>
            </ActionBarGroup>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );

  const banner = <ConnectionBanner state={state} onReconnect={reconnect} />;

  return (
    <ConversationShell banner={banner} canvas={canvas} rail={panel}>
      {!state.sessionLoaded ? (
        <SessionSkeleton />
      ) : isRailScreen(screen) ? (
        <ConversationRail
          state={state}
          actions={{
            critique: critiqueAndRecord,
            cancel,
            arm,
            reconnect,
          }}
          getOrgUrl={getOrgUrl}
          voice={voice}
          pendingNote={pendingNote}
        />
      ) : screen === "brief" ? (
        // A brief left open on the Start page — its blanks and readback live
        // there; this surface only revises what already exists.
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          This workflow's brief is still open — finish it on the Start page,
          then come back here to revise the result.
        </p>
      ) : (
        // At rest: an adopted or settled session with nothing to replay. The
        // whole surface is the invitation to say what should change.
        <>
          <h1 className="text-2xl font-semibold tracking-tight">
            {workflowName || workflow?.name || "This workflow"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tell me what to change and I'll rebuild it — it runs once so you can
            check the result before anything goes live.
          </p>
          <CritiqueForm leading onSubmit={critiqueAndRecord} />
        </>
      )}
    </ConversationShell>
  );
}
