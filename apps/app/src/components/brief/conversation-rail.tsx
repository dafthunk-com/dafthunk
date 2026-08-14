import type { GenerationPhase, IntegrationProvider } from "@dafthunk/types";
import Check from "lucide-react/icons/check";
import Loader2 from "lucide-react/icons/loader-2";
import type React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { thinkingTextClass } from "@/components/brief/brief-sentence";
import { ConnectProviderCard } from "@/components/brief/connect-card";
import { OutcomeView } from "@/components/brief/outcome-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GrowingTextarea, textareaClassName } from "@/components/ui/textarea";
import type { BriefNote, BriefState } from "@/hooks/use-workflow-brief";
import { getProviderLabel, useIntegrations } from "@/integrations";
import { cn } from "@/utils/utils";
import { failedSteps } from "@/utils/workflow-outcome";

/**
 * The conversation half of the generator's stage, shared between the brief
 * page (where a workflow is born) and the workflow page's Describe mode
 * (where one is revised). Everything here is a state of the same session:
 * the narrated wait, the verdict, the next move.
 *
 * What is NOT here is deliberate: the creation-only screens (the request
 * hero, suggestions, the brief sentence and its blanks) stay on the brief
 * page, and `ask` is not on the surface at all — a fresh ask on an adopted
 * session would regenerate the workflow rather than revise it.
 */

/**
 * One line of human copy per phase. No stepper — there is nothing to count.
 *
 * A fallback only: the server sends its own label with every phase frame
 * ("Fixing 2 problem(s)", "Changing it so it does not do that"), and the live
 * narration always wins over this map. Two phases must never share a line —
 * the label going silent across a real boundary reads as a stall.
 */
const PHASE_COPY: Record<GenerationPhase, string> = {
  briefing: "Reading that back",
  selecting: "Choosing the pieces",
  planning: "Planning the steps",
  generating: "Wiring it up",
  validating: "Checking it holds together",
  repairing: "Fixing something up",
  saving: "Almost there",
  running: "Trying it once, safely",
  complete: "Done",
};

/**
 * Whether losing the transport right now would strand something in motion.
 *
 * Mid-flight, a lost connection takes over the screen — the person is waiting
 * on frames that can no longer arrive. Settled, it is a strip: the result is
 * already in front of them and reattaching is only needed for the next turn.
 */
function isMidFlight(status: BriefState["status"]): boolean {
  return status === "running" || status === "awaiting";
}

export type RailScreen =
  // Page-owned: the rail classifies these but never renders them — each page
  // decides what its front door, suggestions, brief readback, or settled
  // pointer looks like.
  | "front-door"
  | "suggestions"
  | "brief"
  | "pointer"
  // Rail-owned: the shared conversation screens.
  | "lost"
  | "running"
  | "cancelled"
  | "failed"
  | "outcome";

const PAGE_SCREENS: ReadonlySet<RailScreen> = new Set([
  "front-door",
  "suggestions",
  "brief",
  "pointer",
]);

/** Whether the rail renders this screen itself, or the page owns it. */
export function isRailScreen(screen: RailScreen): boolean {
  return !PAGE_SCREENS.has(screen);
}

/**
 * Which screen the session is showing. Total by design: the classification
 * names the page-owned screens too, so their gating conditions live in this
 * one tested table instead of being restated (and eventually reordered) by
 * every page. The ORDER here is the contract: lost-midflight beats
 * everything, running beats every settled screen.
 */
export function railScreen(state: BriefState): RailScreen {
  if (state.connection === "lost" && isMidFlight(state.status)) return "lost";
  if (state.status === "idle" && !state.brief && !state.suggestions) {
    return "front-door";
  }
  if (state.suggestions && state.status !== "running") return "suggestions";
  if (state.brief && state.status === "awaiting") return "brief";
  if (state.status === "running") return "running";
  if (
    state.status === "failed" &&
    state.error?.code === "CANCELLED" &&
    !state.workflowId
  ) {
    return "cancelled";
  }
  // Settled, with a workflow, and nothing was replayed: the pruned-session
  // pointer, whose copy depends on where the page sits.
  if (
    (state.status === "done" || state.status === "failed") &&
    state.workflowId &&
    !state.replayed
  ) {
    return "pointer";
  }
  if (state.status === "failed" && !state.execution) return "failed";
  return "outcome";
}

/**
 * A quiet strip, not a screen change: while retries are pending the session
 * is fine and the page must stay exactly where it is. Returns null whenever
 * the transport has nothing to say.
 */
export function ConnectionBanner({
  state,
  onReconnect,
}: {
  state: Pick<BriefState, "connection" | "connectionDetail" | "status">;
  onReconnect: () => void;
}) {
  if (state.connection === "reconnecting") {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground"
      >
        <Loader2 className="size-3.5 animate-spin" />
        Reconnecting…
      </div>
    );
  }
  if (state.connection === "lost" && !isMidFlight(state.status)) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Connection lost.
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground"
          onClick={onReconnect}
        >
          Reconnect
        </button>
      </div>
    );
  }
  return null;
}

/**
 * The wait for a named session to be described.
 *
 * Shimmer where the sentence will be, and only after a few seconds any words —
 * a fetch that resolves in half a second should never have said anything.
 */
export function SessionSkeleton() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-3" role="status" aria-label="Loading session">
      <Skeleton className="h-8 w-4/5" />
      <Skeleton className="h-8 w-3/5" />
      <Skeleton className="h-8 w-2/5" />
      {slow && <p className="text-sm text-muted-foreground">Still fetching…</p>}
    </div>
  );
}

/**
 * "This looks stuck", said only after the server's own stall threshold.
 *
 * The timer resets whenever the run visibly moves — a new phase, a new label,
 * a new trail entry. Mirrors the server's 180s stall clock rather than
 * inventing a second opinion: the lazy server-side detection only fires when
 * the *next* message tries to claim the turn, which a person quietly waiting
 * never sends.
 */
function StallNotice({ signature }: { signature: string }) {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    setStalled(false);
    const timer = setTimeout(() => setStalled(true), 180_000);
    return () => clearTimeout(timer);
  }, [signature]);

  if (!stalled) return null;
  return (
    <p className="text-sm text-muted-foreground">
      This is taking much longer than it should — it may be stuck. You can keep
      waiting, or start over; nothing has been lost either way.
    </p>
  );
}

/**
 * The live narration, typed character by character — the signature of a
 * model streaming its words. Mounted keyed by its text, so every new label
 * restarts the typing; the resting caret keeps blinking to say more is
 * coming. The full text lives in a visually-hidden span so the enclosing
 * live region announces whole sentences, never keystrokes.
 */
function TypedLabel({ text }: { text: string }) {
  const [count, setCount] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? text.length
      : 0
  );

  useEffect(() => {
    if (count >= text.length) return;
    const timer = setTimeout(() => setCount(count + 1), 18);
    return () => clearTimeout(timer);
  }, [count, text.length]);

  return (
    <span className="text-foreground">
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, count)}
        <span className="wire-caret" />
      </span>
    </span>
  );
}

/**
 * What this workspace could not do, and what was chosen on the user's behalf.
 *
 * Only ever the messages marked important by the server — a capability that
 * silently vanished, or a resource bound without being asked about. Both are
 * things a person would otherwise discover by wondering why the result is
 * wrong.
 */
function BriefNotes({
  notes,
  getOrgUrl,
}: {
  notes: BriefNote[];
  getOrgUrl: (path: string) => string;
}) {
  if (notes.length === 0) return null;

  return (
    <div className="space-y-2">
      {notes.map((note, index) => (
        <p
          key={`${note.message}-${index}`}
          className={cn(
            "text-muted-foreground",
            // The dashed aside this flow already uses for "here is what I did
            // instead" — same kind of message, so the same shape, and the
            // weight does the work a hue used to.
            note.level === "warn"
              ? "rounded-md border border-dashed p-3 text-sm"
              : "text-xs"
          )}
        >
          {note.message}
          {note.link === "integrations" && (
            <>
              {" "}
              <Link
                to={getOrgUrl("integrations")}
                className="underline underline-offset-2"
              >
                Manage connections
              </Link>
            </>
          )}
        </p>
      ))}
    </div>
  );
}

/**
 * "What should be different?" — always present, never behind a toggle: the
 * only reliable way to surface intent someone did not know they had left out
 * is to let them react to something concrete.
 */
export function CritiqueForm({
  onSubmit,
  leading,
  children,
}: {
  onSubmit: (note: string) => void;
  /** Demoted to secondary while another button leads the screen. */
  leading: boolean;
  /** Extra buttons beside the submit — the brief page's "Start over". */
  children?: React.ReactNode;
}) {
  const [note, setNote] = useState("");

  const submit = () => {
    if (!note.trim()) return;
    onSubmit(note);
    setNote("");
  };

  return (
    <form
      className="space-y-2 border-t pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {/* Grows with what is typed, like the request box on /start — this is
          the same conversation, continued, and a critique is often longer
          than the ask that started it. */}
      <GrowingTextarea
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && note.trim()) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="What should be different?"
        className={textareaClassName}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant={leading ? "default" : "secondary"}
          disabled={!note.trim()}
        >
          Fix it
        </Button>
        {children}
      </div>
    </form>
  );
}

/**
 * The commitment moment, in whichever voice the page speaks.
 *
 * Creation: everything above proved the workflow works once, on demand — and
 * nothing anywhere turned the schedule on. Ending on a saved draft, unsaid,
 * converts the whole arc into a demo; this converts the demo into the job.
 * Offered only on a clean run there.
 *
 * Revision: the rebuild paused a trigger that may have been live, and saying
 * so plainly is the deal that lets the agent rewrite live workflows at all —
 * nothing re-arms behind the user's back. Shown on partial outcomes too,
 * with the honesty adjusted: withholding the re-arm there would strand a
 * paused workflow behind a result the user might be fine with.
 */
/** The outcome's verdict line, honest to what actually happened. */
function OutcomeHeadline({ state }: { state: BriefState }) {
  const rehearsed = (state.rehearsal?.nodes.length ?? 0) > 0;

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
      {state.error?.code === "CANCELLED" ? (
        <p className="text-lg">
          Stopped, as asked. What was built so far is saved.
        </p>
      ) : state.outcome === "partial" && !state.execution ? (
        // The catch path: something broke after the save and before a run
        // settled. The workflow exists; the trial did not finish.
        <p className="text-lg">
          It's saved, but I couldn't finish trying it. Tell me what to change,
          or open the workflow and run it yourself.
        </p>
      ) : state.outcome === "partial" ? (
        <div className="space-y-2">
          <p className="text-lg">
            It ran, but did not finish cleanly. Tell me what to change.
          </p>
          {/* The frame kept every step's error; hiding them here asks the
              user to diagnose blind while the diagnosis sits in state. */}
          {state.workflow &&
            state.execution &&
            failedSteps(state.workflow, state.execution).map((step, index) => (
              <p
                key={`${step.name}-${index}`}
                className="text-sm text-muted-foreground"
              >
                The "{step.name}" step failed
                {step.error ? <>: {step.error}</> : "."}
              </p>
            ))}
        </div>
      ) : (
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            I tried it once. Here's what came out
          </h1>
          {/* Both caveats in one breath when both apply — two apology lines
              under one heading read as two problems. */}
          {state.sampleName && rehearsed ? (
            <p className="text-sm text-muted-foreground">
              I invented "{state.sampleName}" and rehearsed the sends, so
              nothing left Dafthunk and the details are stand-ins. Your real
              data goes through the same steps.
            </p>
          ) : rehearsed ? (
            <p className="text-sm text-muted-foreground">
              The sending steps were rehearsed — nothing actually left Dafthunk.
              Your real accounts stay untouched until you turn it on.
            </p>
          ) : state.sampleName ? (
            <p className="text-sm text-muted-foreground">
              I invented "{state.sampleName}" and ran it on that, so the details
              are stand-ins. Your real data goes through the same steps.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Whether the arm affordance is on the table at all — the one predicate the
 * arm card and the button hierarchy must agree on. Creation offers it only
 * on a clean, uncancelled run; revision offers it whenever the rebuild
 * paused something, because withholding the re-arm would strand a paused
 * workflow behind a result the user might be fine with.
 */
function armOffered(
  state: BriefState,
  voice: "creation" | "revision",
  /**
   * An account the workflow needs is not wired in yet. Arming now would
   * schedule a failure, so the connect call to action takes the arm card's
   * place until the wiring is done.
   */
  connectPending = false
): boolean {
  if (connectPending) return false;
  if (!state.dormant || !state.workflowId) return false;
  return voice === "creation"
    ? state.outcome === "ok" && state.error?.code !== "CANCELLED"
    : true;
}

function ArmCard({
  state,
  voice,
  armLabel,
  leading,
  connectPending,
  onArm,
  getOrgUrl,
}: {
  state: BriefState;
  voice: "creation" | "revision";
  /** Creation only: the schedule-bearing button label. */
  armLabel?: string;
  leading: boolean;
  connectPending: boolean;
  onArm: () => void;
  getOrgUrl: (path: string) => string;
}) {
  if (state.armed) {
    return (
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Check className="size-4 shrink-0" />
          {voice === "creation"
            ? "It's on — it will run on its own from now on."
            : "It's on — running on its own again."}
        </p>
        {voice === "creation" && (
          <p className="text-sm text-muted-foreground">
            It lives under{" "}
            <Link
              className="underline underline-offset-2 hover:text-foreground"
              to={getOrgUrl("workflows")}
            >
              Workflows
            </Link>{" "}
            from here on.
          </p>
        )}
      </div>
    );
  }

  if (!armOffered(state, voice, connectPending)) return null;

  return (
    <div className="space-y-3 rounded-lg border p-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [animation-delay:360ms] [animation-fill-mode:backwards] motion-reduce:animate-none">
      <p className="text-sm">
        {voice === "creation"
          ? "It isn't running on its own yet — this run only happened because you asked."
          : state.outcome === "partial"
            ? "This change paused its trigger, and the run hit trouble — fix it, or start it again anyway."
            : "This change paused its trigger — nothing runs on its own until you start it again."}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={leading ? "default" : "secondary"} onClick={onArm}>
          {voice === "creation"
            ? (armLabel ?? "Turn this on")
            : "Start it running again"}
        </Button>
        <span className="text-xs text-muted-foreground">
          You can turn it off any time.
        </span>
      </div>
    </div>
  );
}

export interface RailActions {
  critique: (note: string) => void;
  cancel: () => void;
  arm: () => void;
  reconnect: () => void;
}

export interface ConversationRailProps {
  state: BriefState;
  actions: RailActions;
  getOrgUrl: (path: string) => string;
  /** Whose arc this is: a workflow being born, or one being revised. */
  voice: "creation" | "revision";
  /**
   * Replaces the default sentence echo on the running screen — the brief
   * page renders its own `BriefSentence` when it agrees with the server.
   */
  sentence?: React.ReactNode;
  /** Between the outcome and the critique form (assumptions, blank cards). */
  outcomeExtras?: React.ReactNode;
  /** Present only where starting over makes sense — the brief page. */
  onStartOver?: () => void;
  /** Creation only: "Start running it every morning" on the arm button. */
  armLabel?: string;
  /** The submitted-but-still-running critique, for the "Changing:" receipt. */
  pendingNote?: string;
}

export function ConversationRail({
  state,
  actions,
  getOrgUrl,
  voice,
  sentence,
  outcomeExtras,
  onStartOver,
  armLabel,
  pendingNote,
}: ConversationRailProps) {
  const screen = railScreen(state);
  // Live connection state, for the outcome screen's connect cross-check.
  // Fetched here rather than in the case block because hooks cannot live
  // inside a switch; every other screen simply ignores it.
  const { integrations } = useIntegrations();

  // While frames stream, the echoed sentence wears the phase-mapped thinking
  // treatment — the model is visibly reading the words, not idling near them.
  const thinking =
    screen === "running"
      ? thinkingTextClass(state.phase ?? "briefing")
      : undefined;

  // The default sentence echo: the flow's spine, muted. Pages replace it when
  // they can render something richer.
  const sentenceEcho =
    sentence ??
    (state.sentence ? (
      <p
        className={cn(
          "text-2xl leading-relaxed tracking-tight text-muted-foreground",
          thinking
        )}
      >
        {state.sentence}
      </p>
    ) : state.prompt ? (
      <p
        className={cn(
          "text-2xl tracking-tight text-muted-foreground",
          thinking
        )}
      >
        {state.prompt}
      </p>
    ) : null);

  switch (screen) {
    // ── Transport gone, session mid-flight ────────────────────────────────
    // The one screen that must never call itself a failure: the server holds
    // the frame log and the build may well have finished. The only wrong
    // button here is one that abandons the session.
    case "lost":
      return (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">
            Connection lost
          </h1>
          <p className="text-sm text-muted-foreground">
            {state.connectionDetail ??
              "Your build is still running on the server — nothing was lost. Reconnect and it will pick up where it left off."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={actions.reconnect}>Reconnect</Button>
            {onStartOver && (
              <Button variant="ghost" onClick={onStartOver}>
                Start over
              </Button>
            )}
          </div>
        </>
      );

    // ── Running ───────────────────────────────────────────────────────────
    case "running": {
      // The final `?? "Working on it"` catches a replayed session whose
      // stored phase predates this protocol and no longer maps to copy.
      const activeLabel = state.cancelling
        ? "Finishing the current step, then stopping"
        : (state.phaseLabel ??
          PHASE_COPY[state.phase ?? "briefing"] ??
          "Working on it");

      return (
        <>
          {sentenceEcho}

          {/* Its own name for what it is making, the moment it has one. The
              step list arrives as clauses; a title is the earliest thing a
              person can check against what they meant. */}
          {state.plan && (
            <div className="space-y-1 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">
              <h2 className="text-lg font-medium tracking-tight">
                {state.plan.title}
              </h2>
              {state.plan.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground animate-in fade-in-0 duration-500 [animation-delay:200ms] [animation-fill-mode:backwards] motion-reduce:animate-none">
                  {state.plan.description}
                </p>
              )}
            </div>
          )}

          {pendingNote && (
            <p className="border-l-2 pl-3 text-sm text-muted-foreground">
              Changing: {pendingNote}
            </p>
          )}

          {/* A live region: this flow is mostly waiting, and a screen reader
              user otherwise submits a request and hears nothing for a minute.
              Visually it is the wire: each completed phase solders a node,
              the link draws down toward the live tip, and the narration types
              itself beside the tip — progress drawn as the thing being built.
              The static phase map only fills gaps in the server's own
              narration. */}
          <div role="status" className="text-sm">
            {state.phaseTrail.map((label, index) => (
              <div
                key={`${label}-${index}`}
                className="relative flex items-start gap-3 pb-3 animate-in fade-in-0 duration-300 motion-reduce:animate-none"
              >
                <span
                  aria-hidden
                  className="wire-link absolute left-[7px] top-3.5 bottom-0 w-0.5 rounded-full bg-border"
                />
                <span
                  aria-hidden
                  className="relative z-10 mt-0.5 flex size-4 shrink-0 items-center justify-center"
                >
                  <span className="wire-node size-2 rounded-full bg-muted-foreground/70" />
                </span>
                <span className="text-muted-foreground/75">{label}</span>
              </div>
            ))}
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex size-4 shrink-0 items-center justify-center"
              >
                <span className="wire-tip size-2.5 rounded-full" />
              </span>
              <TypedLabel key={activeLabel} text={activeLabel} />
            </div>
          </div>

          <StallNotice
            signature={`${state.phase}:${state.phaseLabel}:${state.phaseTrail.length}`}
          />

          <BriefNotes notes={state.notes} getOrgUrl={getOrgUrl} />

          {/* Acknowledged the moment it is clicked. The pipeline only reads
              its cancel flag between model calls, so the real stop can be
              half a minute out — a button that stays clickable and silent for
              that long gets clicked again and then distrusted. */}
          <Button
            variant="ghost"
            onClick={actions.cancel}
            disabled={state.cancelling}
          >
            {state.cancelling ? "Stopping…" : "Cancel"}
          </Button>
        </>
      );
    }

    // ── Stopped on request, nothing kept ──────────────────────────────────
    case "cancelled":
      return (
        <>
          <p className="text-lg">Stopped. Nothing was saved or sent.</p>
          {onStartOver && <Button onClick={onStartOver}>Start again</Button>}
        </>
      );

    // ── Failed outright ───────────────────────────────────────────────────
    case "failed":
      return (
        <>
          <p className="text-lg">
            {state.error?.message ?? "That did not work."}
          </p>
          <BriefNotes notes={state.notes} getOrgUrl={getOrgUrl} />
          {onStartOver ? (
            <Button onClick={onStartOver}>Try something else</Button>
          ) : (
            // No front door to go back to in Describe mode — but the
            // workflow is still standing, and a failed turn is claimable
            // again, so the recovery is another ask in different words.
            state.workflowId && (
              <CritiqueForm leading onSubmit={actions.critique} />
            )
          )}
        </>
      );

    // ── Outcome ───────────────────────────────────────────────────────────
    case "outcome": {
      // The report is a snapshot from build time; the user may have linked an
      // account since (possibly via this very screen's OAuth round trip), so
      // it is cross-checked against what is connected *now*. Still missing →
      // the connect card leads. Linked since the build → the workflow's own
      // input is still unbound, so a canned critique rebuilds with the
      // account wired in.
      const reported = state.rehearsal?.unconnectedProviders ?? [];
      const connectedNow = new Set<string>(
        (integrations ?? []).map((integration) => integration.provider)
      );
      const stillUnconnected = reported.filter(
        (provider) => !connectedNow.has(provider)
      );
      const connectedSinceBuild = reported.filter((provider) =>
        connectedNow.has(provider)
      );
      const connectPending = reported.length > 0;

      // Leads only when the trial ran clean on real data — over stand-ins or
      // errors, correcting still beats committing.
      const commitLeads =
        armOffered(state, voice, connectPending) &&
        !state.armed &&
        state.outcome === "ok" &&
        (voice === "revision" || !state.sampleName);

      const rehearsedNodeIds = new Set(
        (state.rehearsal?.nodes ?? []).map((node) => node.nodeId)
      );

      return (
        <>
          {state.sentence && (
            <p className="text-sm text-muted-foreground">{state.sentence}</p>
          )}

          <OutcomeHeadline state={state} />

          {state.workflow && state.execution && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [animation-delay:240ms] [animation-fill-mode:backwards] motion-reduce:animate-none">
              <OutcomeView
                workflow={state.workflow}
                execution={state.execution}
                rehearsedNodeIds={rehearsedNodeIds}
              />
            </div>
          )}

          {stillUnconnected.map((provider) => (
            <ConnectProviderCard
              key={provider}
              provider={provider}
              title={`To make this real, connect ${getProviderLabel(provider as IntegrationProvider)}`}
              description="Those steps ran as a rehearsal. Link the account and I'll wire it in — you'll come straight back here."
            />
          ))}

          {connectedSinceBuild.map((provider) => {
            const label = getProviderLabel(provider as IntegrationProvider);
            return (
              <div
                key={provider}
                className="space-y-3 rounded-lg border p-4 animate-in fade-in-0 duration-300 motion-reduce:animate-none"
              >
                <p className="text-sm">
                  {label} is connected now, but this workflow was built before
                  it was — its steps aren't wired to your account yet.
                </p>
                <Button
                  onClick={() =>
                    actions.critique(
                      `I connected ${label} — use my account for those steps.`
                    )
                  }
                >
                  Wire in {label} and try it again
                </Button>
              </div>
            );
          })}

          <ArmCard
            state={state}
            voice={voice}
            armLabel={armLabel}
            leading={commitLeads}
            connectPending={connectPending}
            onArm={actions.arm}
            getOrgUrl={getOrgUrl}
          />

          <BriefNotes notes={state.notes} getOrgUrl={getOrgUrl} />

          {outcomeExtras}

          {/* "Fix it" leads unless the commitment button does — two primaries
              on one screen is no hierarchy at all. */}
          <CritiqueForm leading={!commitLeads} onSubmit={actions.critique}>
            {onStartOver && (
              <Button variant="ghost" onClick={onStartOver} type="button">
                Start over
              </Button>
            )}
          </CritiqueForm>
        </>
      );
    }

    default:
      return null;
  }
}
