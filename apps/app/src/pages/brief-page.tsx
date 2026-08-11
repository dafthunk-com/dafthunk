import type { BriefAnswers, BriefBlank } from "@dafthunk/types";
import {
  renderBriefSentence,
  resolveBlank,
  resolveDestination,
  unansweredAssumptions,
} from "@dafthunk/utils";
import ArrowRight from "lucide-react/icons/arrow-right";
import Logs from "lucide-react/icons/logs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { BriefBlankCard } from "@/components/brief/brief-blank-card";
import { BriefSentence } from "@/components/brief/brief-sentence";
import { ConnectCard } from "@/components/brief/connect-card";
import {
  ConnectionBanner,
  ConversationRail,
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkflowSchematicView } from "@/components/workflow/workflow-schematic-view";
import { useOrgUrl } from "@/hooks/use-org-url";
import { useWorkflowBrief } from "@/hooks/use-workflow-brief";
import { markOutcomeSeen, markWorkflowKept } from "@/services/profile-service";
import { useNodeTypes } from "@/services/type-service";
import { cn } from "@/utils/utils";

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
  // Kept after the box is cleared so the wait can show what was asked for.
  // A repair round takes long enough that "Fixing something up" over the
  // original sentence gives no way to tell whether the note was even received.
  const [pendingNote, setPendingNote] = useState("");

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

  const banner = <ConnectionBanner state={state} onReconnect={reconnect} />;

  const startOver = () => {
    reset();
    setRequest("");
    setAnswers({});
    setOpenBlankId(null);
    setPendingNote("");
    navigate(getOrgUrl("start"), { replace: true });
  };

  // The graph as it currently stands, for every screen that shows the stage
  // plain — no run pulse, no outcome overlays. One definition, so the
  // approval gate, a lost connection, and a failure can never disagree about
  // what "the picture" is.
  const graphCanvas =
    state.workflow && state.workflow.nodes.length > 0 ? (
      <WorkflowSchematicView
        workflow={state.workflow}
        nodeTypes={nodeTypes}
        className="h-full"
      />
    ) : undefined;

  const submitRequest = (prompt: string) => {
    lastPromptRef.current = prompt;
    setAnswers({});
    setOpenBlankId(null);
    ask(prompt);
  };

  // The one critique entry point: sends the note and keeps it on screen as
  // the "Changing:" receipt while the rebuild runs.
  const critiqueAndRecord = (note: string) => {
    critique(note);
    setPendingNote(note);
  };

  const railActions = {
    critique: critiqueAndRecord,
    approve,
    decline,
    cancel,
    arm,
    reconnect,
  };
  const screen = railScreen(state);

  // ── Fetching a named session ────────────────────────────────────────────
  // A URL session the server has not yet described. Rendering the pristine
  // "What do you want to get done?" here made a mid-build reload flash the
  // first-run hero over ten minutes of history.
  if (sessionId && !state.sessionLoaded) {
    return (
      <ConversationShell>
        <SessionSkeleton />
      </ConversationShell>
    );
  }

  // ── Transport gone, session mid-flight ──────────────────────────────────
  if (screen === "lost") {
    return (
      // Whatever was built stays on the stage while the socket is down —
      // blanking the picture would say "lost" when nothing is.
      <ConversationShell canvas={graphCanvas}>
        <ConversationRail
          state={state}
          actions={railActions}
          getOrgUrl={getOrgUrl}
          voice="creation"
          onStartOver={startOver}
        />
      </ConversationShell>
    );
  }

  // ── Ask ─────────────────────────────────────────────────────────────────
  if (screen === "front-door") {
    // Front doors recognize you the second time. Only a fresh /start gets the
    // memory line — on a named session URL you are already where it points.
    const lastSession =
      !sessionId && orgId ? readLastSession(orgId) : undefined;

    return (
      <ConversationShell banner={banner}>
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
        {/* A bookmarked session that was reclaimed: it never built anything,
            so there is nothing to point at — and silence here read as the
            page having eaten it. Sessions that did build carry their pointer
            in the session frame and land on the built-workflow screen. */}
        {sessionId && (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            This session has ended. If it built a workflow, you'll find it under
            Workflows.
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
      </ConversationShell>
    );
  }

  // ── Too thin to read back ───────────────────────────────────────────────
  if (screen === "suggestions" && state.suggestions) {
    return (
      <ConversationShell banner={banner}>
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
      </ConversationShell>
    );
  }

  // ── Waiting on permission to act ────────────────────────────────────────
  if (screen === "approval") {
    // Consent anchored to the thing consented to: the user's own sentence
    // stays on screen, with the phrase that leaves the platform marked.
    const destinationBlankId = state.brief?.blanks.find(
      (blank) => blank.role === "destination"
    )?.id;

    return (
      <ConversationShell banner={banner} canvas={graphCanvas}>
        <ConversationRail
          state={state}
          actions={railActions}
          getOrgUrl={getOrgUrl}
          voice="creation"
          onStartOver={startOver}
          sentence={
            sentenceAgrees && state.brief ? (
              <BriefSentence
                brief={state.brief}
                answers={answers}
                openBlankId={null}
                onOpenBlank={() => {}}
                disabled
                highlightBlankId={destinationBlankId}
              />
            ) : undefined
          }
        />
      </ConversationShell>
    );
  }

  // ── Brief ───────────────────────────────────────────────────────────────
  if (screen === "brief" && state.brief) {
    return (
      <ConversationShell banner={banner}>
        <BriefSentence
          brief={state.brief}
          answers={answers}
          openBlankId={openBlankId}
          onOpenBlank={setOpenBlankId}
        />

        {/* Said before they commit, not after. Someone who asked for Slack and
            is about to get email needs that in front of them while the
            sentence is still editable. */}
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
          {/* One name, always. The guesses live in a caption, not in the
              verb. */}
          {unansweredAssumptions(state.brief, answers).length > 0 && (
            <p className="text-sm text-muted-foreground">
              The dotted parts are questions; the tinted parts are my guesses —
              all fine to leave, all tappable.
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
      </ConversationShell>
    );
  }

  // ── Running ─────────────────────────────────────────────────────────────
  if (screen === "running") {
    return (
      <ConversationShell
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
                    key={`${step}-${index}`}
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
        <ConversationRail
          state={state}
          actions={railActions}
          getOrgUrl={getOrgUrl}
          voice="creation"
          onStartOver={startOver}
          pendingNote={pendingNote}
          // The same sentence element as the brief screen, muted — the flow's
          // spine persists instead of being replaced by an unrelated <p>.
          // Only when it agrees with what the server echoed; the echo wins
          // otherwise (the rail's default).
          sentence={
            sentenceAgrees && state.brief ? (
              <BriefSentence
                brief={state.brief}
                answers={answers}
                openBlankId={null}
                onOpenBlank={() => {}}
                disabled
              />
            ) : !state.sentence && request ? (
              <p className="text-2xl tracking-tight text-muted-foreground">
                {request}
              </p>
            ) : undefined
          }
        />
      </ConversationShell>
    );
  }

  // ── Stopped on request ──────────────────────────────────────────────────
  if (screen === "cancelled") {
    return (
      <ConversationShell banner={banner}>
        <ConversationRail
          state={state}
          actions={railActions}
          getOrgUrl={getOrgUrl}
          voice="creation"
          onStartOver={startOver}
        />
      </ConversationShell>
    );
  }

  // ── A finished session, revisited after its replay log was pruned ───────
  // The run row outlives the frames, and the session frame carries its
  // pointer — so a visitor arriving past the hour gets the workflow's front
  // door rather than the outcome scaffolding rendered around nothing.
  if (screen === "pointer") {
    return (
      <ConversationShell banner={banner}>
        <h1 className="text-2xl font-semibold tracking-tight">
          This one's already built
        </h1>
        <p className="text-sm text-muted-foreground">
          {state.prompt
            ? `The workflow from "${state.prompt}" is saved.`
            : "The workflow this session built is saved."}{" "}
          {state.status === "failed" &&
            "Its last run hit trouble, so look it over before relying on it."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() =>
              navigate(
                getOrgUrl(
                  `workflows/${state.workflowId}?mode=describe&view=overview${
                    state.executionId ? `&executionId=${state.executionId}` : ""
                  }`
                )
              )
            }
          >
            Open it
            <ArrowRight className="ml-2 size-4" />
          </Button>
          <Button variant="ghost" onClick={startOver}>
            Start over
          </Button>
        </div>
      </ConversationShell>
    );
  }

  // ── Failed outright ─────────────────────────────────────────────────────
  if (screen === "failed") {
    return (
      // What got built before it failed is context for "that did not
      // work", not something to hide.
      <ConversationShell banner={banner} canvas={graphCanvas}>
        <ConversationRail
          state={state}
          actions={railActions}
          getOrgUrl={getOrgUrl}
          voice="creation"
          onStartOver={startOver}
        />
      </ConversationShell>
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

  return (
    <ConversationShell
      banner={banner}
      // What ran, stamped with how each step fared — the finish of the scene
      // the running screen played, still on the canvas where it played.
      canvas={
        state.workflow &&
        state.workflow.nodes.length > 0 && (
          <div className="relative h-full animate-in fade-in-0 duration-300 [animation-delay:120ms] [animation-fill-mode:backwards] motion-reduce:animate-none">
            {/* Bottom-left: where the editor keeps its status bar, and this
                is status — what the thing is, how many steps it has. */}
            <p className="absolute bottom-4 left-4 z-10 text-xs text-muted-foreground">
              "{state.workflow.name}" · {state.workflow.nodes.length} steps
            </p>
            {/* Actions on the artifact live on the artifact, icon-for-icon
                the editor's own chrome, in the corner the editor keeps its
                controls — following them lands on the same canvas with more
                buttons, not on a different page. The rail keeps the
                conversation: fixing, committing, starting over. */}
            {(state.workflowId || state.executionId) && (
              <TooltipProvider>
                <div className="absolute right-4 top-4 z-10">
                  <ActionBarGroup>
                    {state.workflowId && (
                      <ActionBarButton
                        onClick={() => {
                          void markWorkflowKept().catch(() => {});
                          navigate(
                            getOrgUrl(
                              `workflows/${state.workflowId}?mode=describe&view=overview${
                                state.executionId
                                  ? `&executionId=${state.executionId}`
                                  : ""
                              }`
                            )
                          );
                        }}
                        className={cn(
                          actionBarButtonOutlineClassName,
                          "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                        )}
                        tooltipSide="bottom"
                        tooltip="Open it in the editor"
                      >
                        <ArrowRight className="size-4!" />
                      </ActionBarButton>
                    )}
                    {state.executionId && (
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
                    )}
                  </ActionBarGroup>
                </div>
              </TooltipProvider>
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
      <ConversationRail
        state={state}
        actions={railActions}
        getOrgUrl={getOrgUrl}
        voice="creation"
        onStartOver={startOver}
        pendingNote={pendingNote}
        armLabel={
          triggerPhrase ? `Start running it ${triggerPhrase}` : undefined
        }
        outcomeExtras={
          <>
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

            {/* Changing an assumption after the run is an edit-intent, not a
                resolve: the server only accepts `resolve` while the brief is
                awaiting, so the answer rides the critique turn as a
                deterministic note. Same card, same gesture the brief screen
                taught — it just costs a rebuild, and the "Changing:" receipt
                says so while it runs. */}
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
                  setAnswers((previous) => ({
                    ...previous,
                    [openBlank.id]: value,
                  }));
                  critiqueAndRecord(note);
                }}
                onDismiss={() => setOpenBlankId(null)}
              />
            )}
          </>
        }
      />
    </ConversationShell>
  );
}
