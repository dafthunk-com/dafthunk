import type { OutwardAction } from "@dafthunk/types";
import AlertTriangle from "lucide-react/icons/alert-triangle";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * The last point at which nothing has happened yet.
 *
 * Everything before this is reversible — a saved workflow nobody ran has
 * changed nothing. The trial run is a real execution against real credentials,
 * so a workflow ending in "post it" posts, to a real account, using text this
 * system invented. That is not something to report afterwards.
 *
 * Declining takes a reason because the reason is worth more than the decline:
 * someone looking at "Post to X" and typing "not publicly" has just said the
 * thing they could not have thought to say when they wrote the request.
 */
export interface ApprovalCardProps {
  actions: OutwardAction[];
  onApprove: () => void;
  onDecline: (reason: string) => void;
}

export function ApprovalCard({
  actions,
  onApprove,
  onDecline,
}: ApprovalCardProps) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 size-5 shrink-0 text-amber-600 dark:text-amber-500" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            This would {actions.length === 1 ? "do" : "do"} something for real
          </h1>
          <p className="text-sm text-muted-foreground">
            To show you it works I have to run it once — and these steps act
            outside Dafthunk. Nothing has been sent yet.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {actions.map((action) => (
          <li key={action.nodeId} className="rounded-lg border p-4">
            <p className="text-sm font-medium">{action.summary}</p>

            {action.details.length > 0 ? (
              <dl className="mt-2 space-y-1">
                {action.details.map((detail) => (
                  <div key={detail.label} className="flex gap-2 text-sm">
                    <dt className="shrink-0 text-muted-foreground">
                      {detail.label}
                    </dt>
                    <dd className="whitespace-pre-wrap break-words">
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              /* Not a formatting gap. Every input comes from an earlier step,
                 so what this sends is written at run time and cannot be shown
                 here — which is exactly the case where someone should be told
                 rather than reassured. */
              <p className="mt-2 text-sm text-muted-foreground">
                What it sends is written by the earlier steps, so I can't show
                you the wording before it runs.
              </p>
            )}
          </li>
        ))}
      </ul>

      {declining ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            onDecline(reason);
          }}
        >
          <label className="text-sm text-muted-foreground" htmlFor="decline">
            What's wrong with it? I'll change it rather than run it.
          </label>
          <Textarea
            id="decline"
            autoFocus
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Don't post it publicly — just show me the result"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!reason.trim()}>
              Change it
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeclining(false)}
            >
              Back
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          {/* "Don't" leads. The safe choice is the one that should be easiest
              to take, and the person reading this has just been told their
              workflow is about to act in the world. */}
          <Button onClick={() => setDeclining(true)}>Don't run it</Button>
          <Button variant="secondary" onClick={onApprove}>
            Run it once
          </Button>
        </div>
      )}
    </div>
  );
}
