import type { GenerationPhase, NodeExecution, Workflow } from "@dafthunk/types";
import AlertTriangle from "lucide-react/icons/alert-triangle";
import ArrowRight from "lucide-react/icons/arrow-right";
import Check from "lucide-react/icons/check";
import Loader2 from "lucide-react/icons/loader-2";
import Sparkles from "lucide-react/icons/sparkles";
import { useEffect, useState } from "react";
import { Link } from "react-router";

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
import { useWorkflowGenerator } from "@/hooks/use-workflow-generator";
import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

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

/** Nodes with no outgoing edge — what the user actually asked to see. */
function terminalNodeIds(workflow: Workflow): Set<string> {
  const withOutgoing = new Set(workflow.edges.map((edge) => edge.source));
  return new Set(
    workflow.nodes.map((n) => n.id).filter((id) => !withOutgoing.has(id))
  );
}

function ResultPanel({
  workflow,
  nodeExecutions,
}: {
  workflow: Workflow;
  nodeExecutions: NodeExecution[];
}) {
  const { createObjectUrl } = useObjectService();
  const terminals = terminalNodeIds(workflow);
  const byId = new Map(workflow.nodes.map((node) => [node.id, node]));

  const shown = nodeExecutions.filter((execution) =>
    terminals.has(execution.nodeId)
  );

  if (shown.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The run finished but produced no terminal output.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {shown.map((execution) => {
        const node = byId.get(execution.nodeId);
        if (!node) return null;

        return (
          <div key={execution.nodeId} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{node.name}</span>
              {execution.status !== "completed" && (
                <Badge variant="destructive">{execution.status}</Badge>
              )}
            </div>

            {execution.error && (
              <p className="text-sm text-destructive">{execution.error}</p>
            )}

            {node.outputs.map((output) => {
              const value = execution.outputs?.[output.name];
              if (value === undefined) return null;
              const parameter = {
                ...output,
                id: output.name,
              } as WorkflowParameter;
              return (
                <Field
                  key={output.name}
                  parameter={parameter}
                  value={value}
                  onChange={() => {}}
                  onClear={() => {}}
                  disabled
                  createObjectUrl={createObjectUrl}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function WorkflowGeneratePage() {
  const [prompt, setPrompt] = useState("");
  const { organization } = useAuth();
  const orgId = organization?.id || "";
  const { getOrgUrl } = useOrgUrl();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { state, generate, cancel, reset } = useWorkflowGenerator(orgId);

  useEffect(() => {
    setBreadcrumbs([{ label: "Workflows" }, { label: "Generate" }]);
  }, [setBreadcrumbs]);

  const isRunning = state.status === "running";
  // Fatal first; the UI only ever renders them as one list.
  const issues = [...state.issues].sort(
    (a, b) => Number(b.severity === "fatal") - Number(a.severity === "fatal")
  );

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
              value={prompt}
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
                onClick={() => generate(prompt)}
                disabled={isRunning || !prompt.trim()}
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
                <Button variant="outline" onClick={reset}>
                  Start over
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {state.status !== "idle" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Stepper
                current={state.phase}
                failed={state.status === "failed"}
              />

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
                        <Link
                          to={getOrgUrl("integrations")}
                          className="underline"
                        >
                          Manage connections
                        </Link>
                      </>
                    )}
                  </span>
                </p>
              ))}

              {state.attempt > 0 && (
                <p className="text-sm text-muted-foreground">
                  Repaired the graph {state.attempt}{" "}
                  {state.attempt === 1 ? "time" : "times"}.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {state.workflow && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {state.workflow.nodes.length} nodes,{" "}
                {state.workflow.edges.length} connections
              </CardTitle>
              <CardDescription>
                Trigger: {state.workflow.trigger}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1 text-sm">
                {state.workflow.nodes.map((node) => (
                  <li key={node.id} className="flex items-center gap-2">
                    <span className="font-medium">{node.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {node.type}
                    </span>
                  </li>
                ))}
              </ul>

              {issues.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {issues.map((issue, index) => (
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
              )}
            </CardContent>
          </Card>
        )}

        {state.execution && state.workflow && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Result</CardTitle>
              {state.outcome === "partial" && (
                <CardDescription>
                  The test run did not finish cleanly. Open it in the editor to
                  run it durably.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <ResultPanel
                workflow={state.workflow}
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
