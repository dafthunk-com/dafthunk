import type { Workflow, WorkflowExecution } from "@dafthunk/types";

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
 * A failed run is the one case that needs different treatment, and it is
 * handled by the caller: the useful move there is "tell me what to change",
 * not a list of node errors.
 */
export interface OutcomeViewProps {
  workflow: Workflow;
  execution: WorkflowExecution;
}

export function OutcomeView({ workflow, execution }: OutcomeViewProps) {
  const { createObjectUrl } = useObjectService();
  const terminals = terminalNodeIds(workflow);

  const results = workflow.nodes
    .filter((node) => terminals.has(node.id))
    .map((node) => ({
      node,
      execution: execution.nodeExecutions.find(
        (entry) => entry.nodeId === node.id
      ),
    }))
    .filter((entry) => entry.execution?.status === "completed");

  if (results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        It ran, but produced nothing to show.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {results.map(({ node, execution: nodeExecution }) => (
        <div key={node.id} className="space-y-2">
          {node.outputs.map((output) => {
            const value = nodeExecution?.outputs?.[output.name];
            if (value === undefined) return null;
            return (
              <Field
                key={output.name}
                parameter={{ ...output, id: output.name } as WorkflowParameter}
                value={value}
                onChange={() => {}}
                onClear={() => {}}
                disabled
                createObjectUrl={createObjectUrl}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
