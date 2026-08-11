import type { Workflow, WorkflowExecution } from "@dafthunk/types";
import { ALL_TRIGGER_NODE_TYPE_IDS } from "@dafthunk/utils";
import Check from "lucide-react/icons/check";

import { Field } from "@/components/workflow/fields/field";
import type { WorkflowParameter } from "@/components/workflow/workflow-types";
import { useObjectService } from "@/services/object-service";
import {
  deliveredPhrase,
  deliveredValues,
  isDeliveryNode,
  terminalNodeIds,
} from "@/utils/workflow-outcome";

/**
 * What the run produced, rendered for a person.
 *
 * Only terminal nodes appear, and no node types, ids or statuses do. Someone
 * who asked for a summary of their inbox wants the summary — the graph that
 * made it is how it was done, not what they asked for, and putting it on this
 * screen is what made the old page read as a compiler transcript.
 *
 * This deliberately does *not* reuse the editor's field widget for text. That
 * widget is an input: it renders a value into a fixed-height disabled textarea,
 * which greys the answer out, clips it mid-sentence with no way to tell there
 * is more, and puts it somewhere you cannot select. An answer is prose, so it
 * is rendered as prose. Binary outputs still go through the widget, which is
 * genuinely the right thing for an image or an audio file.
 */
export interface OutcomeViewProps {
  workflow: Workflow;
  execution: WorkflowExecution;
  /**
   * Nodes whose outward effect was rehearsed rather than performed. Their
   * delivery line switches to the past conditional — the payload shown is
   * exactly what was composed, and nothing left Dafthunk.
   */
  rehearsedNodeIds?: ReadonlySet<string>;
}

/**
 * Output names that are plumbing rather than an answer.
 *
 * Only reached for nodes that produce something as well — a node whose outputs
 * are *entirely* plumbing is a delivery node, handled separately, because
 * filtering everything it returned would leave the screen claiming it produced
 * nothing when it had in fact sent an email.
 */
const PLUMBING = new Set([
  "messageId",
  "message_id",
  "id",
  "status",
  "recipientCount",
  "recipient_count",
]);

/** Types the editor widget renders better than prose can. */
const BINARY_TYPES = new Set([
  "blob",
  "image",
  "audio",
  "video",
  "document",
  "gltf",
]);

/** A human label for an output, since node authors name them for machines. */
function labelFor(name: string): string {
  const spaced = name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

export function OutcomeView({
  workflow,
  execution,
  rehearsedNodeIds,
}: OutcomeViewProps) {
  const { createObjectUrl } = useObjectService();
  const terminals = terminalNodeIds(workflow);

  const completed = workflow.nodes
    // A trigger's outputs are what *started* the run — a timestamp, a cron
    // expression, the incoming payload. They are never the answer, and a graph
    // whose trigger has no outgoing edge would otherwise put "Schedule
    // Expression: manual-execution" where the summary should be.
    .filter(
      (node) =>
        terminals.has(node.id) && !ALL_TRIGGER_NODE_TYPE_IDS.has(node.type)
    )
    .map((node) => ({
      node,
      execution: execution.nodeExecutions.find(
        (entry) => entry.nodeId === node.id
      ),
    }))
    .filter((entry) => entry.execution?.status === "completed");

  /**
   * A node that hands something over answers with a receipt, so the answer is
   * what it was given. Separated before anything is rendered because the two
   * need opposite treatment: one shows its output, the other shows its input
   * under a line saying what became of it.
   */
  const deliveries = completed
    .filter(({ node }) => isDeliveryNode(node))
    .map(({ node }) => ({
      node,
      values: deliveredValues(workflow, execution, node),
    }));

  const results = completed.filter(({ node }) => !isDeliveryNode(node));

  // Everything a completed terminal node produced, minus the plumbing. A raw
  // Message-ID is proof the mail went out, not the thing anybody asked for,
  // and leading with it makes a working run look like debug output.
  const shown = results.flatMap(({ node, execution: nodeExecution }) =>
    node.outputs
      .filter((output) => !PLUMBING.has(output.name))
      .map((output) => ({
        key: `${node.id}.${output.name}`,
        output,
        // The node's name, not the port's. Every display node calls its port
        // "value", so labelling by port produced two blocks both headed
        // "Display Value" — while the node names sitting right there said
        // "Tables (JSON)" and "Tables Summary".
        label: node.name || labelFor(output.name),
        value: nodeExecution?.outputs?.[output.name],
      }))
      .filter((entry) => entry.value !== undefined)
  );

  if (shown.length === 0 && deliveries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        It ran, but produced nothing to show.
      </p>
    );
  }

  // A single text answer is the common case and needs no label — the heading
  // above it already says what it is. A delivery brings its own heading, so it
  // never counts towards this.
  const bare =
    deliveries.length === 0 &&
    shown.length === 1 &&
    asText(shown[0].value) !== undefined;

  return (
    <div className="space-y-5">
      {/* What was sent, under a line saying it was. The run succeeded and the
          screen has to say so first — a delivery node's own output is a receipt
          (`recipientCount`, a message id), and rendering that in place of the
          answer is how a working digest was reported to the user as "1". */}
      {deliveries.map(({ node, values }) => {
        const rehearsed = rehearsedNodeIds?.has(node.id) ?? false;
        return (
          <div key={node.id} className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Check className="size-4 shrink-0" />
              {deliveredPhrase(node, rehearsed)}
            </p>

            {values.length > 0 ? (
              <div className="space-y-3 border-l-2 pl-3">
                {values.map((value) => (
                  <div key={value.name} className="space-y-1">
                    {values.length > 1 && (
                      <p className="text-xs font-medium text-muted-foreground">
                        {labelFor(value.name)}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-base leading-relaxed">
                      {value.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              // Every input was computed from something the preview does not
              // carry, or was binary. Better to say what happened and stop
              // than to imply the delivery was empty.
              <p className="text-sm text-muted-foreground">
                {rehearsed
                  ? "What it would send is written by the earlier steps at run time."
                  : "The content is in the workflow's run."}
              </p>
            )}
          </div>
        );
      })}

      {shown.map(({ key, output, label, value }) => {
        const text = asText(value);

        if (text !== undefined) {
          return (
            <div key={key} className="space-y-1">
              {!bare && (
                <p className="text-xs font-medium text-muted-foreground">
                  {label}
                </p>
              )}
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {text}
              </p>
            </div>
          );
        }

        if (BINARY_TYPES.has(output.type)) {
          return (
            <div key={key} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <Field
                parameter={{ ...output, id: output.name } as WorkflowParameter}
                value={value}
                onChange={() => {}}
                onClear={() => {}}
                disabled
                createObjectUrl={createObjectUrl}
              />
            </div>
          );
        }

        return (
          <div key={key} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
