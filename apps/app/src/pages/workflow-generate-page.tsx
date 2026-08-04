import type {
  GenerationPhase,
  GenerationValidationIssue,
  Node,
  NodeExecution,
  Workflow,
} from "@dafthunk/types";
import AlertTriangle from "lucide-react/icons/alert-triangle";
import ArrowRight from "lucide-react/icons/arrow-right";
import Check from "lucide-react/icons/check";
import ChevronDown from "lucide-react/icons/chevron-down";
import ChevronRight from "lucide-react/icons/chevron-right";
import Loader2 from "lucide-react/icons/loader-2";
import Sparkles from "lucide-react/icons/sparkles";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/workflow/fields/field";
import type { WorkflowParameter } from "@/components/workflow/workflow-types";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import type {
  GenerationAttempt,
  GenerationState,
} from "@/hooks/use-workflow-generator";
import {
  latestAttempt,
  useWorkflowGenerator,
} from "@/hooks/use-workflow-generator";
import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";
import { terminalNodeIds } from "@/utils/workflow-outcome";

const EXAMPLES = [
  "Summarize a long piece of text and show me the summary",
  "When an email arrives, classify how urgent it is and draft a reply",
  "An HTTP endpoint that takes a topic and returns three headline ideas",
];

/** Phases shown in the stepper, in the order the pipeline reaches them. */
const STEPS: Array<{ phase: GenerationPhase; label: string }> = [
  { phase: "selecting", label: "Select" },
  { phase: "planning", label: "Plan" },
  { phase: "generating", label: "Build" },
  { phase: "validating", label: "Check" },
  { phase: "saving", label: "Save" },
  { phase: "running", label: "Run" },
];

function Stepper({
  current,
  failed,
}: {
  current?: GenerationPhase;
  failed: boolean;
}) {
  // Completion is positional: STEPS is the fixed order the pipeline walks, so
  // the current phase's index is all the state needed.
  const currentIndex =
    current === "complete"
      ? STEPS.length
      : STEPS.findIndex((step) => step.phase === current);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STEPS.map((step, index) => {
        const isDone = currentIndex > index;
        const isActive = currentIndex === index;
        return (
          <div
            key={step.phase}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
              isActive && !failed && "border-primary text-primary",
              isDone && "border-muted text-muted-foreground",
              !isActive && !isDone && "border-muted text-muted-foreground/50"
            )}
          >
            {isActive && !failed ? (
              <Loader2 className="size-3 animate-spin" />
            ) : isDone ? (
              <Check className="size-3" />
            ) : null}
            {step.label}
          </div>
        );
      })}
    </div>
  );
}

/** Fatal first — the UI renders them as one list. */
function sortIssues(
  issues: GenerationValidationIssue[]
): GenerationValidationIssue[] {
  return [...issues].sort(
    (a, b) => Number(b.severity === "fatal") - Number(a.severity === "fatal")
  );
}

function IssueList({ issues }: { issues: GenerationValidationIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm">
      {sortIssues(issues).map((issue, index) => (
        <li
          key={`${issue.code}-${index}`}
          className={
            issue.severity === "fatal"
              ? "text-destructive"
              : "text-muted-foreground"
          }
        >
          {issue.message}
        </li>
      ))}
    </ul>
  );
}

function NodeList({ nodes }: { nodes: Node[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {nodes.map((node) => (
        <li key={node.id} className="flex items-center gap-2">
          <span className="font-medium">{node.name}</span>
          <span className="text-xs text-muted-foreground">{node.type}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The agent's passes at producing a valid graph.
 *
 * Attempt 0 is the first draft; later ones are repairs driven by the validation
 * errors shown beneath each. Only the newest is expanded — the earlier ones
 * matter when you want to know *why* it retried.
 */
function AttemptHistory({ attempts }: { attempts: GenerationAttempt[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const newest = attempts[attempts.length - 1]?.attempt ?? null;

  if (attempts.length < 2) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {attempts.length} attempts at a valid graph
      </p>
      {attempts.map((entry) => {
        const isOpen = (expanded ?? newest) === entry.attempt;
        const fatal = entry.issues.filter((i) => i.severity === "fatal").length;

        return (
          <div key={entry.attempt} className="rounded-md border">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? -1 : entry.attempt)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              {isOpen ? (
                <ChevronDown className="size-4 shrink-0" />
              ) : (
                <ChevronRight className="size-4 shrink-0" />
              )}
              <span className="font-medium">
                {entry.attempt === 0
                  ? "First draft"
                  : `Repair ${entry.attempt}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.workflow?.nodes.length ?? 0} nodes
              </span>
              {fatal > 0 ? (
                <Badge variant="destructive" className="ml-auto">
                  {fatal} problem{fatal === 1 ? "" : "s"}
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-auto">
                  valid
                </Badge>
              )}
            </button>

            {isOpen && (
              <div className="space-y-3 border-t px-3 py-3">
                {entry.workflow && <NodeList nodes={entry.workflow.nodes} />}
                <IssueList issues={entry.issues} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The whole run, node by node.
 *
 * Terminal nodes render their values, since that is the result the user asked
 * for. Every other node still appears with its status, because when a run comes
 * back partial the useful information is *which* step broke — showing only
 * terminals left a failed run looking empty.
 */
function ExecutionTrace({
  workflow,
  nodeExecutions,
}: {
  workflow: Workflow;
  nodeExecutions: NodeExecution[];
}) {
  const { createObjectUrl } = useObjectService();
  const terminals = terminalNodeIds(workflow);
  const byId = new Map(workflow.nodes.map((node) => [node.id, node]));

  // Ordered by the graph, not by however the executor reported them.
  const ordered = workflow.nodes
    .map((node) => ({
      node,
      execution: nodeExecutions.find((e) => e.nodeId === node.id),
    }))
    .filter((entry) => entry.execution !== undefined);

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The run recorded no node executions.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {ordered.map(({ node, execution }) => {
        if (!execution) return null;
        const isTerminal = terminals.has(node.id);
        const failed = execution.status !== "completed";

        return (
          <div key={node.id} className="space-y-2">
            <div className="flex items-center gap-2">
              {failed ? (
                <AlertTriangle className="size-4 shrink-0 text-destructive" />
              ) : (
                <Check className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{node.name}</span>
              <span className="text-xs text-muted-foreground">{node.type}</span>
              {failed && (
                <Badge variant="destructive">{execution.status}</Badge>
              )}
            </div>

            {execution.error && (
              <p className="pl-6 text-sm text-destructive">{execution.error}</p>
            )}

            {isTerminal && (
              <div className="space-y-2 pl-6">
                {byId.get(node.id)?.outputs.map((output) => {
                  const value = execution.outputs?.[output.name];
                  if (value === undefined) return null;
                  return (
                    <Field
                      key={output.name}
                      parameter={
                        { ...output, id: output.name } as WorkflowParameter
                      }
                      value={value}
                      onChange={() => {}}
                      onClear={() => {}}
                      disabled
                      createObjectUrl={createObjectUrl}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressCard({ state }: { state: GenerationState }) {
  const { getOrgUrl } = useOrgUrl();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Stepper current={state.phase} failed={state.status === "failed"} />

        {state.plan && (
          <div className="space-y-1">
            <p className="text-sm font-medium">{state.plan.title}</p>
            <p className="text-sm text-muted-foreground">
              {state.plan.description}
            </p>
            {state.plan.steps.length > 0 && (
              <ol className="list-decimal pl-5 text-sm text-muted-foreground">
                {state.plan.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        {state.logs.map((log, index) => (
          <p
            key={`${log.message}-${index}`}
            className={cn(
              "flex items-start gap-2 text-sm",
              log.level === "warn"
                ? "text-amber-600 dark:text-amber-500"
                : "text-muted-foreground"
            )}
          >
            {log.level === "warn" && (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            )}
            <span>
              {log.message}
              {log.level === "warn" && (
                <>
                  {" "}
                  <Link to={getOrgUrl("integrations")} className="underline">
                    Manage connections
                  </Link>
                </>
              )}
            </span>
          </p>
        ))}

        <AttemptHistory attempts={state.attempts} />
      </CardContent>
    </Card>
  );
}

export function WorkflowGeneratePage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgId = organization?.id || "";
  const { getOrgUrl } = useOrgUrl();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  // Putting the session in the URL is what makes a run survive navigation: the
  // server keeps the frame log, so reopening the address replays it.
  const onSessionStarted = useCallback(
    (session: string) =>
      navigate(getOrgUrl(`workflows/generate/${session}`), { replace: true }),
    [navigate, getOrgUrl]
  );

  const { state, generate, cancel, reset } = useWorkflowGenerator(orgId, {
    sessionId,
    onSessionStarted,
  });

  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ label: "Workflows" }, { label: "Generate" }]);
  }, [setBreadcrumbs]);

  const isRunning = state.status === "running";
  const latest = latestAttempt(state);
  // Sessions are reclaimed an hour after they finish, so an old link can point
  // at nothing. Say so rather than rendering what looks like a fresh form.
  const expired =
    Boolean(sessionId) &&
    state.sessionLoaded &&
    state.status === "idle" &&
    state.attempts.length === 0;
  // A resumed session arrives with the original request but an empty box.
  const promptValue = prompt || state.prompt || "";

  const startOver = () => {
    reset();
    setPrompt("");
    navigate(getOrgUrl("workflows/generate"), { replace: true });
  };

  return (
    <InsetLayout title="Generate a workflow">
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Describe what you want</CardTitle>
            <CardDescription>
              Say what should happen in plain English. We build the workflow,
              check it, and run it once so you can see the result.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={promptValue}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Summarize incoming support emails and highlight the urgent ones"
              rows={3}
              disabled={isRunning}
            />

            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setPrompt(example)}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => generate(promptValue)}
                disabled={isRunning || !promptValue.trim()}
              >
                {isRunning ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                Generate
              </Button>
              {isRunning && (
                <Button variant="outline" onClick={cancel}>
                  Cancel
                </Button>
              )}
              {state.status !== "idle" && !isRunning && (
                <Button variant="outline" onClick={startOver}>
                  Start over
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {expired && (
          <Card>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <p className="text-sm text-muted-foreground">
                This generation is no longer available. Runs are kept for an
                hour.
              </p>
              <Button variant="outline" onClick={startOver}>
                Start over
              </Button>
            </CardContent>
          </Card>
        )}

        {state.status !== "idle" && <ProgressCard state={state} />}

        {latest?.workflow && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {latest.workflow.nodes.length} nodes,{" "}
                {latest.workflow.edges.length} connections
              </CardTitle>
              <CardDescription>
                Trigger: {latest.workflow.trigger}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <NodeList nodes={latest.workflow.nodes} />
              <IssueList issues={latest.issues} />
            </CardContent>
          </Card>
        )}

        {state.execution && latest?.workflow && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Run</CardTitle>
              <CardDescription>
                {state.outcome === "partial"
                  ? "The test run did not finish cleanly. Open it in the editor to run it durably."
                  : `Finished ${state.execution.status}.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExecutionTrace
                workflow={latest.workflow}
                nodeExecutions={state.execution.nodeExecutions ?? []}
              />
            </CardContent>
          </Card>
        )}

        {state.error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{state.error.message}</p>
            </CardContent>
          </Card>
        )}

        {state.workflowId && (
          <Button asChild>
            <Link to={getOrgUrl(`workflows/${state.workflowId}`)}>
              Open in editor
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        )}
      </div>
    </InsetLayout>
  );
}
