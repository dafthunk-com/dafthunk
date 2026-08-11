/**
 * Stored workflow → the generator's draft dialect.
 *
 * Exists for adoption: when a session is asked to critique a workflow it did
 * not build, the model must see that workflow as if it had emitted it — the
 * same dialect its own drafts use, planted as the conversation's last
 * assistant message. The projection therefore favors round-trip fidelity over
 * economy: every literal that would survive a generation must survive this.
 *
 * Related but different: `templateToEmitFormat` projects templates into the
 * same dialect for few-shot prompting. It swaps pinned Workers AI models for
 * catalog stand-ins and drops hidden inputs, because an example teaches shape,
 * not state. An adopted workflow is state — its types are already real
 * registry types, and its hidden inputs are user data (input-widget nodes keep
 * their value on a hidden input), so both rules invert here.
 */

import type { Node, Workflow } from "@dafthunk/types";
import { TRIGGER_TO_NODE_TYPES } from "@dafthunk/utils";

import type { DraftNode, GeneratedWorkflowDraft } from "./draft-types";
import { RESPONDER_NODE_ID, TRIGGER_NODE_ID } from "./hydrate";

/**
 * Every literal input value, hidden ones included.
 *
 * Connected inputs carry no `value` in the stored shape, so nothing here can
 * shadow an edge. The arming values on the trigger node — the cron line, the
 * mailbox, the bot binding — ride along too, which is what lets hydration
 * merge them onto its injected node and `disarm` collect them for the `arm`
 * turn to restore.
 */
function draftInputs(node: Node): Record<string, unknown> | undefined {
  const entries: Record<string, unknown> = {};
  for (const input of node.inputs) {
    if (input.value === undefined) continue;
    entries[input.name] = input.value;
  }
  return Object.keys(entries).length ? entries : undefined;
}

/**
 * Projects a stored workflow into the draft dialect the model emits.
 *
 * The one structural rewrite is identity: hydration owns trigger and
 * responder nodes and injects them under the fixed ids `"trigger"` and
 * `"responder"`, dropping any draft node of a trigger type and any edge
 * touching an id it does not know. The stored graph names those nodes
 * `<type>-<uuid>`, so the first node of each role is renamed to the id
 * hydration will inject — in the node list and on every edge — and its
 * literals then merge onto the injected node instead of being dropped with
 * it. A second node of a trigger type has no id to claim and is dropped at
 * hydration; that degradation is pinned by test rather than hidden here.
 */
export function workflowToDraft(workflow: Workflow): GeneratedWorkflowDraft {
  const [triggerType, responderType] =
    TRIGGER_TO_NODE_TYPES[workflow.trigger] ?? [];

  const idMap = new Map<string, string>();
  const triggerNode = triggerType
    ? workflow.nodes.find((node) => node.type === triggerType)
    : undefined;
  if (triggerNode) idMap.set(triggerNode.id, TRIGGER_NODE_ID);
  const responderNode = responderType
    ? workflow.nodes.find((node) => node.type === responderType)
    : undefined;
  if (responderNode) idMap.set(responderNode.id, RESPONDER_NODE_ID);
  const mapId = (id: string) => idMap.get(id) ?? id;

  const nodes: DraftNode[] = workflow.nodes.map((node) => ({
    id: mapId(node.id),
    type: node.type,
    name: node.name,
    inputs: draftInputs(node),
  }));

  return {
    title: workflow.name,
    description: workflow.description ?? "",
    trigger: workflow.trigger,
    steps: [],
    nodes,
    edges: workflow.edges.map((edge) => ({
      ...edge,
      source: mapId(edge.source),
      target: mapId(edge.target),
    })),
  };
}
