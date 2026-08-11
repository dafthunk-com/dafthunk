import type { BriefAnswers } from "@dafthunk/types";
import {
  renderBriefSentence,
  resolveDestination,
  unansweredAssumptions,
} from "@dafthunk/utils";
import ArrowRight from "lucide-react/icons/arrow-right";
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
  type AuroraLevel,
  ThinkingAurora,
} from "@/components/brief/thinking-aurora";
import { Button } from "@/components/ui/button";
import { useOrgUrl } from "@/hooks/use-org-url";
import { useWorkflowBrief } from "@/hooks/use-workflow-brief";
import { markWorkflowKept } from "@/services/profile-service";

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

/**
 * A single reading-width column, centered, lit from behind.
 *
 * No stage, no canvas: everything visual about the build lives on the
 * workflow page now, and a split screen whose right half is permanently
 * empty would only say that something is missing. Here the sentence is the
 * whole page — and the aurora behind it is atmosphere, not information:
 * ambient while the person holds the pen, blooming while the model does.
 * Every screen returns this same component at the same tree position, which
 * is what lets the aurora persist and crossfade between levels instead of
 * cutting.
 */
function Centered({
  aurora = "off",
  banner,
  children,
}: {
  aurora?: AuroraLevel;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <ThinkingAurora level={aurora} />
      <div className="relative mx-auto w-full max-w-2xl space-y-6 px-6 py-16">
        {banner}
        {children}
      </div>
    </>
  );
}

/**
 * The front door, and only the front door.
 *
 * /start owns the making of a first version: the request, the brief
 * readback, and the early build. The moment a first version of the workflow
 * exists, the stage moves to the workflow page's Describe mode — the same
 * rail, the same canvas — and everything after the save (the approval gate,
 * the trial run, the outcome, the arm card) plays there. One place per
 * screen, and the workflow's own page is where the workflow lives.
 */
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

  const [request, setRequest] = useState("");
  const [answers, setAnswers] = useState<BriefAnswers>({});
  const [openBlankId, setOpenBlankId] = useState<string | null>(null);

  // ── The handoff ─────────────────────────────────────────────────────────
  // The first `saved` frame is the workflow coming into existence, and it is
  // the moment this page's job ends: navigate to the workflow page, whose
  // Describe mode attaches to the same session and replays it — the running
  // screen continues there, then the approval gate, the outcome, the arm.
  // The same effect also redirects a revisited settled session (its
  // `session` frame carries the workflowId), which is why /start needs no
  // "already built" screen of its own.
  const handedOff = useRef(false);
  useEffect(() => {
    if (!state.workflowId || handedOff.current) return;
    handedOff.current = true;
    // The arrival replaces the old "Open it" click; the stamp rides along.
    void markWorkflowKept().catch(() => {});
    navigate(
      getOrgUrl(`workflows/${state.workflowId}?mode=describe&view=overview`),
      { replace: true }
    );
  }, [state.workflowId, navigate, getOrgUrl]);

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
    navigate(getOrgUrl("start"), { replace: true });
  };

  const submitRequest = (prompt: string) => {
    lastPromptRef.current = prompt;
    setAnswers({});
    setOpenBlankId(null);
    ask(prompt);
  };

  const railActions = { critique, approve, decline, cancel, arm, reconnect };
  const screen = railScreen(state);

  // ── Fetching a named session ────────────────────────────────────────────
  // A URL session the server has not yet described. Rendering the pristine
  // "What do you want to get done?" here made a mid-build reload flash the
  // first-run hero over ten minutes of history.
  if (sessionId && !state.sessionLoaded) {
    return (
      <Centered aurora="ambient">
        <SessionSkeleton />
      </Centered>
    );
  }

  // ── Transport gone, session mid-flight ──────────────────────────────────
  if (screen === "lost") {
    return (
      // Whatever was built stays on the stage while the socket is down —
      // blanking the picture would say "lost" when nothing is.
      <Centered>
        <ConversationRail
          state={state}
          actions={railActions}
          getOrgUrl={getOrgUrl}
          voice="creation"
          onStartOver={startOver}
        />
      </Centered>
    );
  }

  // ── Ask ─────────────────────────────────────────────────────────────────
  if (screen === "front-door") {
    // Front doors recognize you the second time. Only a fresh /start gets the
    // memory line — on a named session URL you are already where it points.
    const lastSession =
      !sessionId && orgId ? readLastSession(orgId) : undefined;

    return (
      <Centered aurora="ambient" banner={banner}>
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
            in the session frame and redirect to the workflow page. */}
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
          {/* Not a boxed form field: the request is typed in the exact style
              the brief sentence reads back in, so the words never change
              costume between being written and being read. The caret and the
              placeholder are the whole affordance — a border here would say
              "form" on a page whose interface is a sentence. */}
          <textarea
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
            className="field-sizing-content w-full resize-none bg-transparent text-2xl leading-relaxed tracking-tight caret-primary outline-none placeholder:text-muted-foreground/50"
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
      </Centered>
    );
  }

  // ── Too thin to read back ───────────────────────────────────────────────
  if (screen === "suggestions" && state.suggestions) {
    return (
      <Centered aurora="ambient" banner={banner}>
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
      </Centered>
    );
  }

  // ── Brief ───────────────────────────────────────────────────────────────
  if (screen === "brief" && state.brief) {
    return (
      <Centered aurora="ambient" banner={banner}>
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
      </Centered>
    );
  }

  // ── Running, pre-save ───────────────────────────────────────────────────
  // Only the early phases play here — briefing through saving. The first
  // `saved` frame triggers the handoff above, and the rest of the build
  // continues on the workflow page.
  if (screen === "running") {
    return (
      <Centered aurora="active" banner={banner}>
        <ConversationRail
          state={state}
          actions={railActions}
          getOrgUrl={getOrgUrl}
          voice="creation"
          onStartOver={startOver}
          // The same sentence element as the brief screen, muted — the flow's
          // spine persists instead of being replaced by an unrelated <p>.
          // Only when it agrees with what the server echoed; the echo wins
          // otherwise (the rail's default). The phase rides along so the
          // sentence shows the model working through it.
          sentence={
            sentenceAgrees && state.brief ? (
              <BriefSentence
                brief={state.brief}
                answers={answers}
                openBlankId={null}
                onOpenBlank={() => {}}
                disabled
                phase={state.phase ?? "briefing"}
              />
            ) : !state.sentence && request ? (
              // Pre-brief, the raw request is all there is — the sweep says
              // it is being read, which is exactly what is happening.
              <p className="thinking-sweep text-2xl tracking-tight text-muted-foreground">
                {request}
              </p>
            ) : undefined
          }
        />
      </Centered>
    );
  }

  // ── Stopped on request ──────────────────────────────────────────────────
  if (screen === "cancelled") {
    return (
      <Centered banner={banner}>
        <ConversationRail
          state={state}
          actions={railActions}
          getOrgUrl={getOrgUrl}
          voice="creation"
          onStartOver={startOver}
        />
      </Centered>
    );
  }

  // ── Failed before anything was saved ────────────────────────────────────
  if (screen === "failed") {
    return (
      // What got built before it failed is context for "that did not
      // work", not something to hide.
      <Centered banner={banner}>
        <ConversationRail
          state={state}
          actions={railActions}
          getOrgUrl={getOrgUrl}
          voice="creation"
          onStartOver={startOver}
        />
      </Centered>
    );
  }

  // ── Everything else lives on the workflow page ──────────────────────────
  // The remaining screens — approval, outcome, the settled pointer — all
  // imply a saved workflow, so the handoff effect above is already
  // navigating. This renders for at most a frame.
  return (
    <Centered banner={banner}>
      <SessionSkeleton />
    </Centered>
  );
}
