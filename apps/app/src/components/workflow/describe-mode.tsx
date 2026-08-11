import type { NodeType, WorkflowState } from "@dafthunk/types";
import { useState } from "react";

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
import { WorkflowSchematicView } from "@/components/workflow/workflow-schematic-view";
import type { useWorkflowBrief } from "@/hooks/use-workflow-brief";

/**
 * The workflow page's Describe mode: the same stage the brief page plays —
 * conversation rail on the left, schematic on the right — turned toward
 * revision. You say what should be different; the agent rebuilds the
 * workflow; the canvas plays the build and stamps the trial run. Its
 * counterpart is Edit mode, where the same workflow is changed by hand.
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
  /** The page's axis switches, centered over this mode's canvas pane. */
  controls?: React.ReactNode;
  getOrgUrl: (path: string) => string;
}) {
  const { state, critique, approve, decline, cancel, reconnect, arm } = brief;
  // Kept after the box is cleared so the wait can show what was asked for.
  const [pendingNote, setPendingNote] = useState("");

  // The one critique entry point: sends the note and keeps it on screen as
  // the "Changing:" receipt while the rebuild runs.
  const critiqueAndRecord = (note: string) => {
    critique(note);
    setPendingNote(note);
  };

  const screen = railScreen(state);

  const workflow =
    (state.workflow && state.workflow.nodes.length > 0
      ? state.workflow
      : undefined) ?? fallbackWorkflow;

  // The canvas pane always exists here so the page's axis switches have a
  // surface to center on — centered on the pane, not the page, because the
  // rail shifts the pane's midpoint well right of the viewport's.
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
    </div>
  );

  const banner = <ConnectionBanner state={state} onReconnect={reconnect} />;

  return (
    <ConversationShell banner={banner} canvas={canvas}>
      {!state.sessionLoaded ? (
        <SessionSkeleton />
      ) : isRailScreen(screen) ? (
        <ConversationRail
          state={state}
          actions={{
            critique: critiqueAndRecord,
            approve,
            decline,
            cancel,
            arm,
            reconnect,
          }}
          getOrgUrl={getOrgUrl}
          voice="revision"
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
