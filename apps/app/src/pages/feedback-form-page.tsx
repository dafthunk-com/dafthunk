import type { FeedbackSentimentType } from "@dafthunk/types";
import Check from "lucide-react/icons/check";
import Download from "lucide-react/icons/download";
import Loader2 from "lucide-react/icons/loader-2";
import MessageCircle from "lucide-react/icons/message-circle";
import MessageCircleQuestion from "lucide-react/icons/message-circle-question";
import ThumbsDown from "lucide-react/icons/thumbs-down";
import ThumbsUp from "lucide-react/icons/thumbs-up";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getApiBaseUrl } from "@/config/api";
import { cn } from "@/utils/utils";

interface VisibleOutput {
  name: string;
  description?: string;
  type: string;
  value?: unknown;
  url?: string;
  mimeType?: string;
  filename?: string;
}

interface VisibleNode {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  outputs: VisibleOutput[];
}

interface Criterion {
  id: string;
  question: string;
  description?: string;
  displayOrder: number;
}

interface FeedbackFormConfig {
  title: string;
  description?: string;
  nodes: VisibleNode[];
  criteria: Criterion[];
  submitted: boolean;
}

interface CriterionResponse {
  sentiment?: FeedbackSentimentType;
  comment?: string;
}

type PageState =
  | { status: "loading" }
  | { status: "ready"; config: FeedbackFormConfig }
  | { status: "submitting"; config: FeedbackFormConfig }
  | { status: "success" }
  | { status: "already_submitted" }
  | { status: "error"; message: string };

function OutputPreview({ output }: { output: VisibleOutput }) {
  if (output.url) {
    if (output.type === "image") {
      return (
        <a
          href={output.url}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-md border bg-muted"
        >
          <img
            src={output.url}
            alt={output.filename || output.name}
            className="h-auto w-full object-contain"
          />
        </a>
      );
    }

    if (output.type === "audio") {
      return (
        <audio controls className="w-full" src={output.url}>
          <track kind="captions" />
        </audio>
      );
    }

    if (output.type === "video") {
      return (
        <video controls className="w-full rounded-md border" src={output.url}>
          <track kind="captions" />
        </video>
      );
    }

    return (
      <a
        href={output.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Download className="h-4 w-4" />
        {output.filename || output.name}
        {output.mimeType ? (
          <span className="text-muted-foreground">({output.mimeType})</span>
        ) : null}
      </a>
    );
  }

  const value = output.value;

  if (value === null || value === undefined || value === "") {
    return <span className="text-sm italic text-muted-foreground">empty</span>;
  }

  if (typeof value === "string") {
    return (
      <div className="whitespace-pre-wrap text-sm wrap-break-word">{value}</div>
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <div className="font-mono text-sm">{String(value)}</div>;
  }

  return (
    <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
      {safeStringify(value)}
    </pre>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function CriterionCard({
  criterion,
  response,
  onChange,
  disabled,
}: {
  criterion: Criterion;
  response: CriterionResponse | undefined;
  onChange: (next: CriterionResponse) => void;
  disabled: boolean;
}) {
  const [showComment, setShowComment] = useState(!!response?.comment);

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center gap-2 px-3 py-2">
        <MessageCircleQuestion className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-sm" title={criterion.question}>
          {criterion.question}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange({
                sentiment: "positive",
                comment: response?.comment,
              })
            }
            className={cn(
              "rounded p-1 transition-colors",
              response?.sentiment === "positive"
                ? "text-green-600"
                : "text-muted-foreground/40 hover:text-green-600"
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange({
                sentiment: "negative",
                comment: response?.comment,
              })
            }
            className={cn(
              "rounded p-1 transition-colors",
              response?.sentiment === "negative"
                ? "text-red-600"
                : "text-muted-foreground/40 hover:text-red-600"
            )}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowComment((v) => !v)}
            className={cn(
              "rounded p-1 transition-colors",
              showComment || response?.comment
                ? "text-foreground"
                : "text-muted-foreground/40 hover:text-foreground"
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {criterion.description && (
        <div className="px-3 pb-2 text-xs text-muted-foreground">
          {criterion.description}
        </div>
      )}
      {showComment && (
        <div className="px-3 pb-2">
          <Textarea
            placeholder="Optional comment..."
            value={response?.comment ?? ""}
            onChange={(e) =>
              onChange({
                sentiment: response?.sentiment,
                comment: e.target.value,
              })
            }
            rows={2}
            className="text-sm"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Public feedback page for workflow output review.
 * No authentication required — the signed token in the URL IS the authorization.
 */
export function FeedbackFormPage() {
  const { signedToken } = useParams<{ signedToken: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [responses, setResponses] = useState<Record<string, CriterionResponse>>(
    {}
  );

  useEffect(() => {
    if (!signedToken) {
      setState({ status: "error", message: "Invalid feedback link" });
      return;
    }

    fetch(`${getApiBaseUrl()}/feedback-forms/${signedToken}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error || "Failed to load feedback"
          );
        }
        return res.json();
      })
      .then((config: FeedbackFormConfig) => {
        if (config.submitted) {
          setState({ status: "already_submitted" });
        } else {
          setState({ status: "ready", config });
        }
      })
      .catch((err: Error) => {
        setState({ status: "error", message: err.message });
      });
  }, [signedToken]);

  const handleSubmit = useCallback(async () => {
    if (state.status !== "ready") return;

    const entries = Object.entries(responses).filter(
      ([, r]) => r.sentiment !== undefined
    );
    if (entries.length === 0) return;

    setState({ status: "submitting", config: state.config });

    try {
      const res = await fetch(
        `${getApiBaseUrl()}/feedback-forms/${signedToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responses: entries.map(([criterionId, r]) => ({
              criterionId,
              sentiment: r.sentiment,
              comment: r.comment?.trim() || undefined,
            })),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const error =
          (data as { error?: string }).error || "Failed to submit feedback";
        if (res.status === 409) {
          setState({ status: "already_submitted" });
        } else {
          setState({ status: "error", message: error });
        }
        return;
      }

      setState({ status: "success" });
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error ? err.message : "Failed to submit feedback",
      });
    }
  }, [state, signedToken, responses]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <CenteredCard title="Something went wrong" description={state.message} />
    );
  }

  if (state.status === "already_submitted") {
    return (
      <CenteredCard
        title="Already Submitted"
        description="Thanks — feedback has already been recorded for this execution."
      />
    );
  }

  if (state.status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <CardTitle>Feedback Recorded</CardTitle>
            <CardDescription>Thank you for your evaluation.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { config } = state;
  const isSubmitting = state.status === "submitting";
  const hasAny = Object.values(responses).some(
    (r) => r.sentiment !== undefined
  );

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">{config.title}</h1>
          {config.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {config.description}
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Workflow Outputs
            </h2>
            {config.nodes.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  No outputs available.
                </CardContent>
              </Card>
            ) : (
              config.nodes.map((node) => (
                <Card key={node.nodeId}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{node.nodeName}</CardTitle>
                    {node.nodeType && (
                      <CardDescription className="font-mono text-xs">
                        {node.nodeType}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {node.outputs.map((output) => (
                      <div key={output.name} className="space-y-1.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">
                            {output.name}
                          </span>
                          {output.description && (
                            <span className="text-xs text-muted-foreground">
                              {output.description}
                            </span>
                          )}
                        </div>
                        <OutputPreview output={output} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Evaluation
            </h2>
            <Card>
              <CardContent className="space-y-2 py-4">
                {config.criteria.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No evaluation criteria have been configured for this
                    workflow.
                  </p>
                ) : (
                  config.criteria.map((criterion) => (
                    <CriterionCard
                      key={criterion.id}
                      criterion={criterion}
                      response={responses[criterion.id]}
                      onChange={(next) =>
                        setResponses((prev) => ({
                          ...prev,
                          [criterion.id]: next,
                        }))
                      }
                      disabled={isSubmitting}
                    />
                  ))
                )}
              </CardContent>
            </Card>
            <Button
              className="w-full"
              disabled={isSubmitting || !hasAny || config.criteria.length === 0}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Submit Feedback
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CenteredCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
