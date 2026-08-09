import type {
  BriefAnswers,
  BriefBlank,
  GenerationPhase,
  GenerationStatus,
} from "@dafthunk/types";
import {
  renderBriefSentence,
  resolveBlank,
  resolveDestination,
  unansweredAssumptions,
} from "@dafthunk/utils";
import ArrowRight from "lucide-react/icons/arrow-right";
import Check from "lucide-react/icons/check";
import Loader2 from "lucide-react/icons/loader-2";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { ApprovalCard } from "@/components/brief/approval-card";
import { BriefBlankCard } from "@/components/brief/brief-blank-card";
import { BriefSentence } from "@/components/brief/brief-sentence";
import { ConnectCard } from "@/components/brief/connect-card";
import { OutcomeView } from "@/components/brief/outcome-view";
import {
  ActionBarButton,
  ActionBarGroup,
  actionBarButtonOutlineClassName,
} from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { WorkflowSchematicView } from "@/components/workflow/workflow-schematic-view";
import { useOrgUrl } from "@/hooks/use-org-url";
import type { BriefNote } from "@/hooks/use-workflow-brief";
import { useWorkflowBrief } from "@/hooks/use-workflow-brief";
import { markOutcomeSeen, markWorkflowKept } from "@/services/profile-service";
import { useNodeTypes } from "@/services/type-service";
import { cn } from "@/utils/utils";
import { failedSteps } from "@/utils/workflow-outcome";

/**
 * Complete jobs, not capabilities.
 *
 * Every one names where the result goes. That is the whole teaching job of
 * this screen: the failure it exists to fix is people describing the
 * interesting half of a task and omitting the obvious half, and an example
 * that omits it too would teach exactly the wrong shape.
 */
const EXAMPLES = [
  "Read my support inbox each morning and email me what's urgent",
  "When someone fills in my contact form, reply and post it to Discord",
  "Turn a blog post into a short summary and email it to me",
];

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
  approving: "Waiting for you",
  running: "Trying it once",
  complete: "Done",
};

/**
 * The value of a blank, as a person would say it.
 *
 * A choice blank's answer is an option id; the sentence shows its label, so
 * anything we write back to the server about that answer has to use the label
 * too — a critique reading `use "opt-2"` is our bookkeeping leaking into their
 * correction.
 */
function blankValueLabel(blank: BriefBlank, value: string): string {
  if (blank.type === "choice") {
    return blank.options.find((option) => option.id === value)?.label ?? value;
  }
  return value;
}

/**
 * Whether losing the transport right now would strand something in motion.
 *
 * Mid-flight, a lost connection takes over the screen — the person is waiting
 * on frames that can no longer arrive. Settled, it is a strip: the result is
 * already in front of them and reattaching is only needed for the next turn.
 */
function isMidFlight(status: GenerationStatus): boolean {
  return status === "running" || status === "awaiting";
}

/** The last brief session, so the second visit to /start has a memory. */
interface LastSession {
  sessionId: string;
  prompt: string;
  at: number;
}

/** Matches the server's hour of frame retention — after that, the link dies. */
const LAST_SESSION_TTL_MS = 60 * 60 * 1000;

const lastSessionKey = (orgId: string) => `dafthunk:brief:last:${orgId}`;

function readLastSession(orgId: string): LastSession | undefined {
  try {
    const raw = localStorage.getItem(lastSessionKey(orgId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as LastSession;
    if (Date.now() - parsed.at > LAST_SESSION_TTL_MS) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeLastSession(orgId: string, entry: LastSession): void {
  try {
    localStorage.setItem(lastSessionKey(orgId), JSON.stringify(entry));
  } catch {
    // Memory is a courtesy; a full or blocked store must never break asking.
  }
}

export function BriefPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgId = organization?.id || "";
  const { getOrgUrl } = useOrgUrl();

  // The latest submitted request, for stamping the session memory — a ref so
  // `onSessionStarted` does not have to be recreated per keystroke.
  const lastPromptRef = useRef("");

  const onSessionStarted = useCallback(
    (session: string) => {
      if (orgId) {
        writeLastSession(orgId, {
          sessionId: session,
          prompt: lastPromptRef.current,
          at: Date.now(),
        });
      }
      navigate(getOrgUrl(`start/${session}`), { replace: true });
    },
    [navigate, getOrgUrl, orgId]
  );

  const {
    state,
    ask,
    resolve,
    critique,
    approve,
    decline,
    cancel,
    reconnect,
    arm,
    reset,
  } = useWorkflowBrief(orgId, { sessionId, onSessionStarted });

  // Only for the schematic's trigger/responder accent — SWR-cached, so this
  // is the same fetch the editor makes when "Open it" is followed.
  const { nodeTypes } = useNodeTypes({ revalidateOnFocus: false });

  const [request, setRequest] = useState("");
  const [answers, setAnswers] = useState<BriefAnswers>({});
  const [openBlankId, setOpenBlankId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  // Kept after the box is cleared so the wait can show what was asked for.
  // A repair round takes long enough that "Fixing something up" over the
  // original sentence gives no way to tell whether the note was even received.
  const [pendingNote, setPendingNote] = useState("");

  const isRunning = state.status === "running";

  // Stamped once per session, when a result is actually on screen. Best-effort
  // and deliberately unawaited: this is observability, and a failed stamp must
  // never be something the user notices.
  const stampedOutcome = useRef(false);
  const hasOutcome = Boolean(state.execution && state.workflow);
  useEffect(() => {
    if (!hasOutcome || stampedOutcome.current) return;
    stampedOutcome.current = true;
    void markOutcomeSeen().catch(() => {});
  }, [hasOutcome]);
  const openBlank = state.brief?.blanks.find(
    (blank) => blank.id === openBlankId
  );
  const chosenDestination = state.brief
    ? resolveDestination(state.brief, answers)
    : undefined;

  // Continuity is only honest when it agrees with the server. The sentence
  // rendered from brief + local answers matches `state.sentence` in the same
  // client session; after a reload the answers are gone, and showing the
  // assumed values under a run built from chosen ones would be a quiet lie —
  // so the echoed string wins whenever the two differ.
  const sentenceAgrees = Boolean(
    state.brief &&
      state.sentence &&
      renderBriefSentence(state.brief, answers) === state.sentence
  );

  // A quiet strip, not a screen change: while retries are pending the session
  // is fine and the page must stay exactly where it is.
  const banner =
    state.connection === "reconnecting" ? (
      <div
        role="status"
        className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground"
      >
        <Loader2 className="size-3.5 animate-spin" />
        Reconnecting…
      </div>
    ) : state.connection === "lost" && !isMidFlight(state.status) ? (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Connection lost.
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground"
          onClick={reconnect}
        >
          Reconnect
        </button>
      </div>
    ) : null;

  const startOver = () => {
    reset();
    setRequest("");
    setAnswers({});
    setOpenBlankId(null);
    setNote("");
    setPendingNote("");
    navigate(getOrgUrl("start"), { replace: true });
  };

  const submitRequest = (prompt: string) => {
    lastPromptRef.current = prompt;
    setAnswers({});
    setOpenBlankId(null);
    ask(prompt);
  };

  // ── Fetching a named session ────────────────────────────────────────────
  // A URL session the server has not yet described. Rendering the pristine
  // "What do you want to get done?" here made a mid-build reload flash the
  // first-run hero over ten minutes of history.
  if (sessionId && !state.sessionLoaded) {
    return (
      <Shell>
        <SessionSkeleton />
      </Shell>
    );
  }

  // ── Transport gone, session mid-flight ──────────────────────────────────
  // The one screen that must never call itself a failure: the server holds
  // the frame log for an hour and the build may well have finished. The only
  // wrong button here is one that abandons the session.
  if (state.connection === "lost" && isMidFlight(state.status)) {
    return (
      <Shell
        // Whatever was built stays on the stage while the socket is down —
        // blanking the picture would say "lost" when nothing is.
        canvas={
          state.workflow &&
          state.workflow.nodes.length > 0 && (
            <WorkflowSchematicView
              workflow={state.workflow}
              nodeTypes={nodeTypes}
              className="h-full"
            />
          )
        }
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          Connection lost
        </h1>
        <p className="text-sm text-muted-foreground">
          {state.connectionDetail ??
            "Your build is still running on the server — nothing was lost. Reconnect and it will pick up where it left off."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={reconnect}>Reconnect</Button>
          <Button variant="ghost" onClick={startOver}>
            Start over
          </Button>
        </div>
      </Shell>
    );
  }

  // ── Ask ─────────────────────────────────────────────────────────────────
  if (state.status === "idle" && !state.brief && !state.suggestions) {
    // Front doors recognize you the second time. Only a fresh /start gets the
    // memory line — on a named session URL you are already where it points.
    const lastSession =
      !sessionId && orgId ? readLastSession(orgId) : undefined;

    return (
      <Shell banner={banner}>
        {lastSession && (
          <p className="text-sm text-muted-foreground">
            Still building "
            {lastSession.prompt.length > 64
              ? `${lastSession.prompt.slice(0, 64)}…`
              : lastSession.prompt}
            "?{" "}
            <Link
              className="underline underline-offset-2 hover:text-foreground"
              to={getOrgUrl(`start/${lastSession.sessionId}`)}
            >
              Pick up where you left off
            </Link>
          </p>
        )}
        {/* A bookmarked session past its hour of retention. The history is
            gone — sessions are reclaimed — and silence here read as the page
            having eaten it. */}
        {sessionId && (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            This session has ended — sessions last about an hour after they
            finish. The workflow itself, if one was built, is under Workflows.
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight">
          What do you want to get done?
        </h1>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitRequest(request);
          }}
        >
          <Textarea
            autoFocus
            rows={2}
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            onKeyDown={(event) => {
              // A one-clause prompt, not a document: Enter submits, the way
              // every chat-shaped box has taught people it does.
              if (event.key === "Enter" && !event.shiftKey && request.trim()) {
                event.preventDefault();
                submitRequest(request);
              }
            }}
            // Not one of the example chips: the same sentence twice on one
            // screen reads as a bug, and a fourth complete job teaches more.
            placeholder="Watch Hacker News for mentions of my product and email me a daily digest"
            className="text-base"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setRequest(example)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {example}
              </button>
            ))}
          </div>
          <Button type="submit" disabled={!request.trim()}>
            Continue
          </Button>
        </form>
      </Shell>
    );
  }

  // ── Too thin to read back ───────────────────────────────────────────────
  if (state.suggestions && !isRunning) {
    return (
      <Shell banner={banner}>
        {/* "Did you mean" is a claim to have understood. Only make it when the
            suggestions actually scored against what they wrote — otherwise
            these are examples, and calling them a guess reads as nonsense. */}
        <h1 className="text-2xl font-semibold tracking-tight">
          {state.suggestionsMatched
            ? "Did you mean something like…"
            : "Tell me a bit more"}
        </h1>
        {!state.suggestionsMatched && (
          <p className="text-sm text-muted-foreground">
            I could not tell what you wanted from that. Add where the result
            should go, or start from one of these.
          </p>
        )}
        <div className="space-y-2">
          {state.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setRequest(suggestion);
                submitRequest(suggestion);
              }}
              className="block w-full rounded-lg border p-4 text-left text-base transition-colors hover:bg-muted"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <Button variant="ghost" onClick={startOver}>
          Let me rephrase
        </Button>
      </Shell>
    );
  }

  // ── Waiting on permission to act ────────────────────────────────────────
  // Ahead of the brief branch deliberately: a held run is also `awaiting` and
  // still has a brief attached, so the brief screen would win and the question
  // would never be asked.
  if (state.pendingActions && state.pendingActions.length > 0) {
    // Consent anchored to the thing consented to: the user's own sentence
    // stays on screen, with the phrase that leaves the platform marked. The
    // gate used to eat the page, asking about "Share Post X" with the words
    // that caused it gone.
    const destinationBlankId = state.brief?.blanks.find(
      (blank) => blank.role === "destination"
    )?.id;

    return (
      <Shell
        banner={banner}
        // The exact graph the decision is about. The card says what would
        // leave the platform; this shows where in the flow that happens.
        canvas={
          state.workflow &&
          state.workflow.nodes.length > 0 && (
            <WorkflowSchematicView
              workflow={state.workflow}
              nodeTypes={nodeTypes}
              className="h-full"
            />
          )
        }
      >
        {sentenceAgrees && state.brief ? (
          <BriefSentence
            brief={state.brief}
            answers={answers}
            openBlankId={null}
            onOpenBlank={() => {}}
            disabled
            highlightBlankId={destinationBlankId}
          />
        ) : state.sentence ? (
          <p className="text-2xl leading-relaxed tracking-tight text-muted-foreground">
            {state.sentence}
          </p>
        ) : null}
        <ApprovalCard
          actions={state.pendingActions}
          onApprove={approve}
          onDecline={decline}
        />
        <BriefNotes notes={state.notes} getOrgUrl={getOrgUrl} />
      </Shell>
    );
  }

  // ── Brief ───────────────────────────────────────────────────────────────
  if (state.brief && state.status === "awaiting") {
    return (
      <Shell banner={banner}>
        <BriefSentence
          brief={state.brief}
          answers={answers}
          openBlankId={openBlankId}
          onOpenBlank={setOpenBlankId}
        />

        {/* Said before they commit, not after. Someone who asked for Slack and
            is about to get email needs that in front of them while the
            sentence is still editable. */}
        {/* Says what we cannot do and stops there. It used to add "so I've
            used something else", which was true and was the problem: the
            something else was whichever account happened to be linked. */}
        {state.brief.unavailableDestination && (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            I can't send to {state.brief.unavailableDestination} yet, so I've
            left the result here rather than sending it somewhere you didn't ask
            for. Pick a destination in the sentence above if you'd rather it
            went somewhere.
          </p>
        )}

        {openBlank && (
          <BriefBlankCard
            // Keyed so switching blanks remounts the card: its draft state is
            // initialised on mount, and without this the second blank opened
            // shows the first one's half-typed answer under its question.
            key={openBlank.id}
            blank={openBlank}
            value={answers[openBlank.id]}
            onAnswer={(value) =>
              setAnswers((current) => ({ ...current, [openBlank.id]: value }))
            }
            onDismiss={() => setOpenBlankId(null)}
          />
        )}

        {/* The chosen destination may need an account linked. Asked here, in
            the sentence they just wrote, rather than as a gate up front. */}
        {chosenDestination?.requiresConnection && (
          <ConnectCard destination={chosenDestination} />
        )}

        <div className="space-y-2">
          {/* One name, always. The old label flipped between "Just try it"
              and "Build it" as answers accumulated — the same act renaming
              itself under the user's hand, reading as the system changing its
              mind. The guesses live in a caption, not in the verb. */}
          {unansweredAssumptions(state.brief, answers).length > 0 && (
            <p className="text-sm text-muted-foreground">
              The dotted parts are my guesses — fine to leave them.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => resolve(answers)}
              disabled={chosenDestination?.requiresConnection}
            >
              Build it
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button variant="ghost" onClick={startOver}>
              Start over
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Running ─────────────────────────────────────────────────────────────
  if (isRunning) {
    return (
      <Shell
        banner={banner}
        // The build, watchable, at the size it deserves. Until the first
        // graph frame lands, the plan's own steps hold the stage as a sketch
        // — the picture's textual predecessor, standing where the picture
        // will — then the graph replaces them in place.
        canvas={
          state.workflow && state.workflow.nodes.length > 0 ? (
            <WorkflowSchematicView
              workflow={state.workflow}
              running={state.phase === "running"}
              nodeTypes={nodeTypes}
              className="h-full"
            />
          ) : state.plan && state.plan.steps.length > 0 ? (
            <EmptyCanvas>
              <ol className="w-72 max-w-full space-y-2">
                {state.plan.steps.map((step, index) => (
                  <li
                    key={step}
                    className="rounded-md border bg-card/60 px-2.5 py-2 text-xs text-muted-foreground shadow-xs animate-in fade-in-0 duration-500 [animation-fill-mode:backwards] motion-reduce:animate-none"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </EmptyCanvas>
          ) : undefined
        }
      >
        {/* The same sentence element as the brief screen, muted — the flow's
            spine persists instead of being replaced by an unrelated <p> that
            happens to contain similar words. Only when it agrees with what
            the server echoed; the echo wins otherwise. */}
        {sentenceAgrees && state.brief ? (
          <BriefSentence
            brief={state.brief}
            answers={answers}
            openBlankId={null}
            onOpenBlank={() => {}}
            disabled
          />
        ) : state.sentence ? (
          <p className="text-2xl leading-relaxed tracking-tight text-muted-foreground">
            {state.sentence}
          </p>
        ) : (
          <p className="text-2xl tracking-tight text-muted-foreground">
            {request || state.prompt}
          </p>
        )}

        {/* Its own name for what it is making, the moment it has one. The
            step list arrives as clauses; a title is the earliest thing a
            person can check against what they meant — and until now it was
            generated and never rendered. */}
        {state.plan && (
          <div className="space-y-1 animate-in fade-in-0 duration-300 motion-reduce:animate-none">
            <h2 className="text-lg font-medium tracking-tight">
              {state.plan.title}
            </h2>
            {state.plan.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
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
            Steps done accrue as a checked list — elapsed time becomes visible
            progress — and the current line is the server's own narration;
            the static map only fills gaps. */}
        <div
          role="status"
          className="space-y-1.5 text-sm text-muted-foreground"
        >
          {state.phaseTrail.map((label, index) => (
            <div
              key={`${label}-${index}`}
              className="flex items-center gap-3 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
            >
              <Check className="size-4 shrink-0" />
              {label}
            </div>
          ))}
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 animate-spin" />
            {state.cancelling
              ? "Finishing the current step, then stopping"
              : (state.phaseLabel ?? PHASE_COPY[state.phase ?? "briefing"])}
          </div>
        </div>

        <StallNotice
          signature={`${state.phase}:${state.phaseLabel}:${state.phaseTrail.length}`}
        />

        <BriefNotes notes={state.notes} getOrgUrl={getOrgUrl} />

        {/* Acknowledged the moment it is clicked. The pipeline only reads its
            cancel flag between model calls, so the real stop can be half a
            minute out — a button that stays clickable and silent for that
            long gets clicked again and then distrusted. */}
        <Button variant="ghost" onClick={cancel} disabled={state.cancelling}>
          {state.cancelling ? "Stopping…" : "Cancel"}
        </Button>
      </Shell>
    );
  }

  // ── Stopped on request ──────────────────────────────────────────────────
  // A cancel the user asked for must never share a screen with a crash: the
  // machine did what it was told, and the copy has to agree.
  if (
    state.status === "failed" &&
    state.error?.code === "CANCELLED" &&
    !state.workflowId
  ) {
    return (
      <Shell banner={banner}>
        <p className="text-lg">Stopped. Nothing was saved or sent.</p>
        <Button onClick={startOver}>Start again</Button>
      </Shell>
    );
  }

  // ── Failed outright ─────────────────────────────────────────────────────
  if (state.status === "failed" && !state.execution) {
    return (
      <Shell
        banner={banner}
        // What got built before it failed is context for "that did not
        // work", not something to hide.
        canvas={
          state.workflow &&
          state.workflow.nodes.length > 0 && (
            <WorkflowSchematicView
              workflow={state.workflow}
              nodeTypes={nodeTypes}
              className="h-full"
            />
          )
        }
      >
        <p className="text-lg">
          {state.error?.message ?? "That did not work."}
        </p>
        <Button onClick={startOver}>Try something else</Button>
      </Shell>
    );
  }

  // ── Outcome ─────────────────────────────────────────────────────────────
  const assumptions = state.brief
    ? unansweredAssumptions(state.brief, answers)
    : [];

  // "every morning", recovered from the brief's own trigger blank, so the
  // commitment button can carry the schedule instead of a feature name.
  const triggerBlank = state.brief?.blanks.find(
    (blank) => blank.role === "trigger"
  );
  const triggerPhrase = triggerBlank
    ? resolveBlank(triggerBlank, answers)
    : undefined;

  // Offered only on a clean run: a result that did not finish cleanly is not
  // something to push someone towards scheduling.
  const showCommitment = Boolean(
    state.dormant &&
      state.workflowId &&
      state.outcome === "ok" &&
      !state.armed &&
      state.error?.code !== "CANCELLED"
  );
  // Leads only when the trial ran on real data. Over "the details are
  // stand-ins", a primary "start running it" would contradict the screen's
  // own honesty — there, correcting still beats committing.
  const commitLeads = showCommitment && !state.sampleName;

  return (
    <Shell
      banner={banner}
      // What ran, stamped with how each step fared — the finish of the scene
      // the running screen played, still on the canvas where it played.
      canvas={
        state.workflow &&
        state.workflow.nodes.length > 0 && (
          <div className="relative h-full animate-in fade-in-0 duration-300 [animation-delay:120ms] [animation-fill-mode:backwards] motion-reduce:animate-none">
            {/* Floats over the canvas the way the editor's own chrome does,
                so the pane is one surface rather than a strip and a canvas. */}
            <p className="absolute left-4 top-4 z-10 text-xs text-muted-foreground">
              "{state.workflow.name}" · {state.workflow.nodes.length} steps
            </p>
            {/* Actions on the artifact live on the artifact, in the corner
                the editor keeps its own controls — following them lands on
                the same canvas with more buttons, not on a different page.
                The rail keeps the conversation: fixing, committing,
                starting over. */}
            {(state.workflowId || state.executionId) && (
              <div className="absolute right-4 top-4 z-10">
                <ActionBarGroup>
                  {state.workflowId && (
                    <ActionBarButton
                      onClick={() => {
                        void markWorkflowKept().catch(() => {});
                        navigate(
                          getOrgUrl(
                            `workflows/${state.workflowId}?view=overview${
                              state.executionId
                                ? `&executionId=${state.executionId}`
                                : ""
                            }`
                          )
                        );
                      }}
                      className={actionBarButtonOutlineClassName}
                    >
                      Open it
                      <ArrowRight className="size-4" />
                    </ActionBarButton>
                  )}
                  {state.executionId && (
                    <ActionBarButton
                      onClick={() =>
                        navigate(getOrgUrl(`executions/${state.executionId}`))
                      }
                      className={actionBarButtonOutlineClassName}
                    >
                      See the full run
                    </ActionBarButton>
                  )}
                </ActionBarGroup>
              </div>
            )}
            <WorkflowSchematicView
              workflow={state.workflow}
              execution={state.execution}
              nodeTypes={nodeTypes}
              className="h-full"
            />
          </div>
        )
      }
    >
      {state.sentence && (
        <p className="text-sm text-muted-foreground">{state.sentence}</p>
      )}

      {/* A declined run has no execution, and saying "it ran" over the top of
          "nothing was sent" is the one thing that would undermine the whole
          gate — the user refused, and the screen must agree that it obeyed. */}
      {/* The arrival is staged: heading first, the result close behind, the
          commitment last — under half a second in total, so the minute of
          waiting ends with a finish rather than a page swap. */}
      <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        {state.error?.code === "CANCELLED" ? (
          <p className="text-lg">
            Stopped, as asked. What was built so far is saved.
          </p>
        ) : state.outcome === "partial" && !state.execution ? (
          <p className="text-lg">
            I changed it and left it unrun. Nothing was sent or posted.
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
              failedSteps(state.workflow, state.execution).map(
                (step, index) => (
                  <p
                    key={`${step.name}-${index}`}
                    className="text-sm text-muted-foreground"
                  >
                    The "{step.name}" step failed
                    {step.error ? <>: {step.error}</> : "."}
                  </p>
                )
              )}
          </div>
        ) : (
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              I tried it once. Here's what came out
            </h1>
            {/* Only when invented input actually drove the run — the server
              checks now, so a digest built from real sources is no longer
              captioned as fake. And the rehearsal points forward instead of
              apologising: stand-ins, same steps, your data next. */}
            {state.sampleName && (
              <p className="text-sm text-muted-foreground">
                I invented "{state.sampleName}" and ran it on that, so the
                details are stand-ins. Your real data goes through the same
                steps.
              </p>
            )}
          </div>
        )}
      </div>

      {state.workflow && state.execution && (
        <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [animation-delay:240ms] [animation-fill-mode:backwards] motion-reduce:animate-none">
          <OutcomeView workflow={state.workflow} execution={state.execution} />
        </div>
      )}

      {/* The commitment moment. The user asked for "each morning"; everything
          above proved it works once, on demand — and nothing anywhere had
          turned the schedule on. Ending on a saved draft, unsaid, converts
          the whole arc into a demo. One line of state and one derived button
          convert the demo into the job. */}
      {showCommitment && (
        <div className="space-y-3 rounded-lg border p-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [animation-delay:360ms] [animation-fill-mode:backwards] motion-reduce:animate-none">
          <p className="text-sm">
            It isn't running on its own yet — this run only happened because you
            asked.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={commitLeads ? "default" : "secondary"}
              onClick={arm}
            >
              {triggerPhrase
                ? `Start running it ${triggerPhrase}`
                : "Turn this on"}
            </Button>
            <span className="text-xs text-muted-foreground">
              You can turn it off any time.
            </span>
          </div>
        </div>
      )}

      {state.armed && (
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Check className="size-4 shrink-0" />
          It's on — it will run on its own from now on.
        </p>
      )}

      <BriefNotes notes={state.notes} getOrgUrl={getOrgUrl} />

      {assumptions.length > 0 && (
        <div className="space-y-1 border-t pt-4">
          {assumptions.map((assumption) => (
            <p
              key={assumption.blankId}
              className="text-xs text-muted-foreground"
            >
              I assumed: {assumption.question}{" "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-controls={`brief-blank-${assumption.blankId}`}
                aria-expanded={openBlankId === assumption.blankId}
                onClick={() =>
                  setOpenBlankId(
                    openBlankId === assumption.blankId
                      ? null
                      : assumption.blankId
                  )
                }
              >
                {assumption.assumed}
              </button>
            </p>
          ))}
        </div>
      )}

      {/* Changing an assumption after the run is an edit-intent, not a resolve:
          the server only accepts `resolve` while the brief is awaiting, so the
          answer rides the critique turn as a deterministic note. Same card,
          same gesture the brief screen taught — it just costs a rebuild, and
          the "Changing:" receipt says so while it runs. */}
      {openBlank && (
        <BriefBlankCard
          key={openBlank.id}
          blank={openBlank}
          value={answers[openBlank.id]}
          onAnswer={(value) => {
            const current = answers[openBlank.id] ?? openBlank.assumed;
            if (value === current) return;
            const note = `Change "${openBlank.question}": use "${blankValueLabel(
              openBlank,
              value
            )}" instead of "${blankValueLabel(openBlank, current)}".`;
            setAnswers((previous) => ({ ...previous, [openBlank.id]: value }));
            critique(note);
            setPendingNote(note);
          }}
          onDismiss={() => setOpenBlankId(null)}
        />
      )}

      {/* Always present, never behind a toggle: the only reliable way to
          surface intent someone did not know they had left out is to let them
          react to something concrete. */}
      <form
        className="space-y-2 border-t pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          critique(note);
          setPendingNote(note);
          setNote("");
        }}
      >
        <Textarea
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && note.trim()) {
              event.preventDefault();
              critique(note);
              setPendingNote(note);
              setNote("");
            }
          }}
          placeholder="What should be different?"
        />
        {/* "Fix it" leads. A run that did not finish cleanly is not something
            to push someone towards keeping, and even a clean one was built
            from invented input — so correcting it is the more likely next
            move than committing to it sight unseen. */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Demoted while the commitment button leads: two primaries on one
              screen is no hierarchy at all. */}
          <Button
            type="submit"
            variant={commitLeads ? "secondary" : "default"}
            disabled={!note.trim()}
          >
            Fix it
          </Button>
          <Button variant="ghost" onClick={startOver} type="button">
            Start over
          </Button>
        </div>
      </form>
    </Shell>
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
    <div className="space-y-1">
      {notes.map((note, index) => (
        <p
          key={`${note.message}-${index}`}
          className={cn(
            "text-xs",
            note.level === "warn"
              ? "text-amber-600 dark:text-amber-500"
              : "text-muted-foreground"
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
 * One stage, from the first keystroke to the finished run.
 *
 * The screen is always the same two things on desktop: the conversation in a
 * reading-width rail on the left — request, readback, narration, verdict,
 * next moves — and the workbench on the right, wearing the editor's surface
 * from the start. Screens are states of this stage, not layouts of their
 * own: the canvas sits empty while the request is written, sketches the plan
 * while pieces are chosen, then fills with the graph — nothing ever jumps.
 * The rail scrolls internally; the page does not scroll at all.
 *
 * On small screens the stage is a luxury the viewport can't pay for: the
 * rail is the page, and the canvas pane appears below it only once there is
 * something on it.
 *
 * No sidebar and no breadcrumbs — this runs before the user has any reason
 * to care that workflows, executions and datasets are separate things.
 *
 * `banner` carries transport news above whatever screen is showing — it must
 * ride along rather than replace, because a dropped socket is not a change in
 * what the session is doing.
 */
function Shell({
  banner,
  canvas,
  children,
}: {
  banner?: React.ReactNode;
  /** What is on the workbench; the empty editor surface when omitted. */
  canvas?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:h-full lg:flex-row lg:overflow-hidden">
      <div className="w-full lg:h-full lg:w-[30rem] lg:shrink-0 lg:overflow-y-auto">
        <div className="space-y-6 px-6 py-16 lg:py-12">
          {banner}
          {children}
        </div>
      </div>
      <div
        className={cn(
          canvas ? "block h-72 w-full border-t" : "hidden",
          "lg:block lg:h-full lg:min-w-0 lg:flex-1 lg:border-l lg:border-t-0"
        )}
      >
        {canvas || <EmptyCanvas />}
      </div>
    </div>
  );
}

/**
 * The workbench with nothing on it yet — the editor's surface, so the place
 * where the workflow will appear exists before the workflow does, and
 * filling it is a change of contents rather than a change of scenery.
 *
 * CSS dots rather than a React Flow instance: an engine is a lot to run for
 * a background, and at 1px and 3% opacity the two are indistinguishable.
 */
function EmptyCanvas({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex h-full items-center justify-center p-6 bg-neutral-100/50",
        "[background-image:radial-gradient(hsl(var(--foreground)/0.04)_1px,transparent_1px)] [background-size:12px_12px]"
      )}
    >
      {children ?? (
        <p className="text-sm text-muted-foreground/60">
          Your workflow takes shape here
        </p>
      )}
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
 * The wait for a named session to be described.
 *
 * Shimmer where the sentence will be, and only after a few seconds any words —
 * a fetch that resolves in half a second should never have said anything.
 */
function SessionSkeleton() {
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
