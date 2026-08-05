import type { Workflow, WorkflowExecution } from "@dafthunk/types";
import { ALL_TRIGGER_NODE_TYPE_IDS } from "@dafthunk/utils";

import { Field } from "@/components/workflow/fields/field";
import type { WorkflowParameter } from "@/components/workflow/workflow-types";
import { useObjectService } from "@/services/object-service";
import { terminalNodeIds } from "@/utils/workflow-outcome";

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
}

/** Output names that are plumbing rather than an answer. */
const PLUMBING = new Set(["messageId", "message_id", "id", "status"]);

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

export function OutcomeView({ workflow, execution }: OutcomeViewProps) {
  const { createObjectUrl } = useObjectService();
  const terminals = terminalNodeIds(workflow);

  const results = workflow.nodes
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

  if (shown.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        It ran, but produced nothing to show.
      </p>
    );
  }

  // A single text answer is the common case and needs no label — the heading
  // above it already says what it is.
  const bare = shown.length === 1 && asText(shown[0].value) !== undefined;

  return (
    <div className="space-y-5">
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
