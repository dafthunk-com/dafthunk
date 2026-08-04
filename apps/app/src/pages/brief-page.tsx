import type { BriefAnswers, GenerationPhase } from "@dafthunk/types";
import { resolveDestination, unansweredAssumptions } from "@dafthunk/utils";
import ArrowRight from "lucide-react/icons/arrow-right";
import Loader2 from "lucide-react/icons/loader-2";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { BriefBlankCard } from "@/components/brief/brief-blank-card";
import { BriefSentence } from "@/components/brief/brief-sentence";
import { ConnectCard } from "@/components/brief/connect-card";
import { OutcomeView } from "@/components/brief/outcome-view";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useOrgUrl } from "@/hooks/use-org-url";
import { useWorkflowBrief } from "@/hooks/use-workflow-brief";
import { markOutcomeSeen, markWorkflowKept } from "@/services/profile-service";
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

/** One line of human copy per phase. No stepper — there is nothing to count. */
const PHASE_COPY: Record<GenerationPhase, string> = {
  briefing: "Reading that back",
  selecting: "Working out the steps",
  planning: "Working out the steps",
  generating: "Wiring it up",
  validating: "Checking it holds together",
  repairing: "Fixing something up",
  saving: "Almost there",
  running: "Trying it once",
  complete: "Done",
};

export function BriefPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgId = organization?.id || "";
  const { getOrgUrl } = useOrgUrl();

  const onSessionStarted = useCallback(
    (session: string) =>
      navigate(getOrgUrl(`start/${session}`), { replace: true }),
    [navigate, getOrgUrl]
  );

  const { state, ask, resolve, critique, cancel, reset } = useWorkflowBrief(
    orgId,
    { sessionId, onSessionStarted }
  );

  const [request, setRequest] = useState("");
  const [answers, setAnswers] = useState<BriefAnswers>({});
  const [openBlankId, setOpenBlankId] = useState<string | null>(null);
  const [note, setNote] = useState("");

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

  const startOver = () => {
    reset();
    setRequest("");
    setAnswers({});
    setOpenBlankId(null);
    setNote("");
    navigate(getOrgUrl("start"), { replace: true });
  };

  const submitRequest = (prompt: string) => {
    setAnswers({});
    setOpenBlankId(null);
    ask(prompt);
  };

  // ── Ask ─────────────────────────────────────────────────────────────────
  if (state.status === "idle" && !state.brief && !state.suggestions) {
    return (
      <Shell>
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
            placeholder="Read my support inbox each morning and email me what's urgent"
            className="text-base"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setRequest(example)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
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
      <Shell>
        <h1 className="text-2xl font-semibold tracking-tight">
          Did you mean something like…
        </h1>
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

  // ── Brief ───────────────────────────────────────────────────────────────
  if (state.brief && state.status === "awaiting") {
    return (
      <Shell>
        <BriefSentence
          brief={state.brief}
          answers={answers}
          openBlankId={openBlankId}
          onOpenBlank={setOpenBlankId}
        />

        {openBlank && (
          <BriefBlankCard
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

        <div className="flex items-center gap-3">
          <Button
            onClick={() => resolve(answers)}
            disabled={chosenDestination?.requiresConnection}
          >
            {state.brief.blanks.length === 0 ||
            Object.keys(answers).length >= state.brief.blanks.length
              ? "Build it"
              : "Just try it"}
            <ArrowRight className="ml-2 size-4" />
          </Button>
          <Button variant="ghost" onClick={startOver}>
            Start over
          </Button>
        </div>
      </Shell>
    );
  }

  // ── Running ─────────────────────────────────────────────────────────────
  if (isRunning) {
    return (
      <Shell>
        {state.sentence ? (
          <p className="text-2xl leading-relaxed tracking-tight text-muted-foreground">
            {state.sentence}
          </p>
        ) : (
          <p className="text-2xl tracking-tight text-muted-foreground">
            {request || state.prompt}
          </p>
        )}

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {PHASE_COPY[state.phase ?? "briefing"]}
        </div>

        <Button variant="ghost" onClick={cancel}>
          Cancel
        </Button>
      </Shell>
    );
  }

  // ── Failed outright ─────────────────────────────────────────────────────
  if (state.status === "failed" && !state.execution) {
    return (
      <Shell>
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

  return (
    <Shell>
      {state.sentence && (
        <p className="text-sm text-muted-foreground">{state.sentence}</p>
      )}

      {state.outcome === "partial" ? (
        <p className="text-lg">
          It ran, but did not finish cleanly. Tell me what to change.
        </p>
      ) : (
        <h1 className="text-2xl font-semibold tracking-tight">
          Here's what that produced
        </h1>
      )}

      {state.workflow && state.execution && (
        <OutcomeView workflow={state.workflow} execution={state.execution} />
      )}

      {assumptions.length > 0 && (
        <div className="space-y-1 border-t pt-4">
          {assumptions.map((assumption) => (
            <p
              key={assumption.blankId}
              className="text-xs text-muted-foreground"
            >
              We assumed: {assumption.question}{" "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setOpenBlankId(assumption.blankId)}
              >
                {assumption.assumed}
              </button>
            </p>
          ))}
        </div>
      )}

      {/* Always present, never behind a toggle: the only reliable way to
          surface intent someone did not know they had left out is to let them
          react to something concrete. */}
      <form
        className="space-y-2 border-t pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          critique(note);
          setNote("");
        }}
      >
        <Textarea
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What should be different?"
        />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" disabled={!note.trim()}>
            Fix it
          </Button>
          {state.workflowId && (
            <Button
              asChild
              onClick={() => void markWorkflowKept().catch(() => {})}
            >
              <Link to={getOrgUrl(`workflows/${state.workflowId}`)}>
                Keep it
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          )}
          <Button variant="ghost" onClick={startOver} type="button">
            Start over
          </Button>
        </div>
      </form>
    </Shell>
  );
}

/**
 * One column, centred, nothing else on screen.
 *
 * No sidebar and no breadcrumbs: this runs before the user has any reason to
 * care that workflows, executions and datasets are separate things.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("mx-auto w-full max-w-2xl space-y-6 px-6 py-16")}>
      {children}
    </div>
  );
}
