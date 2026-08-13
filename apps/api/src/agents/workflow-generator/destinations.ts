import type {
  BriefDestination,
  NodeType,
  WorkflowTrigger,
} from "@dafthunk/types";
import { TRIGGER_TO_NODE_TYPES } from "@dafthunk/utils";

/**
 * Where a generated workflow's result can actually end up.
 *
 * This is the missing half of most requests. People describe the interesting
 * part of a job — "triage my support email" — and leave the destination unsaid
 * because it is obvious to them. The generator then builds exactly what was
 * asked, terminating in a widget nobody looks at.
 *
 * The catalog is hand-written rather than derived, for two reasons. `NodeType`
 * carries no "this delivers something" flag, and each entry needs a phrase that
 * reads inside an English sentence, which no amount of metadata would produce.
 * There are only about ten.
 *
 * Nothing here is offered unless it can be built *right now*, for this
 * organization, on this deployment. An unreachable destination is worse than a
 * missing one: it becomes a promise the run cannot keep.
 */

interface DestinationSpec {
  id: string;
  kind: BriefDestination["kind"];
  provider?: string;
  /** Reads inside the sentence: "…and show me the result here." */
  label: string;
  /** Any one of these realizes it. Ordered by preference. */
  nodeTypes: string[];
  /** Only offered for these triggers. */
  requiresTrigger?: WorkflowTrigger[];
}

/**
 * `display` is last because it is the fallback, not a choice. Everything above
 * it leaves the platform, which is what the user almost always meant.
 */
const DESTINATION_SPECS: readonly DestinationSpec[] = [
  {
    id: "respond",
    kind: "respond",
    label: "return it to whoever called the endpoint",
    nodeTypes: ["http-response"],
    requiresTrigger: ["http_request"],
  },
  {
    id: "respond-form",
    kind: "respond",
    label: "show it to whoever submitted the form",
    nodeTypes: ["form-response"],
    requiresTrigger: ["form_request"],
  },
  {
    id: "google-mail",
    kind: "integration",
    provider: "google-mail",
    label: "send it from your Gmail account",
    nodeTypes: ["send-email-google-mail"],
  },
  {
    id: "discord",
    kind: "integration",
    provider: "discord",
    label: "post it to Discord",
    nodeTypes: ["send-message-discord"],
  },
  {
    id: "x",
    kind: "integration",
    provider: "x",
    label: "post it to X",
    nodeTypes: ["share-post-x"],
  },
  {
    id: "linkedin",
    kind: "integration",
    provider: "linkedin",
    label: "post it to LinkedIn",
    nodeTypes: ["share-post-linkedin"],
  },
  {
    id: "reddit",
    kind: "integration",
    provider: "reddit",
    label: "post it to Reddit",
    nodeTypes: ["share-post-reddit"],
  },
  {
    id: "wordpress",
    kind: "integration",
    provider: "wordpress",
    label: "publish it to your WordPress site",
    nodeTypes: ["create-post-wordpress"],
  },
  {
    id: "github",
    kind: "integration",
    provider: "github",
    label: "commit it to your GitHub repository",
    nodeTypes: ["create-update-file-github"],
  },
  {
    id: "google-calendar",
    kind: "integration",
    provider: "google-calendar",
    label: "put it in your Google Calendar",
    nodeTypes: ["create-event-google-calendar"],
  },
  {
    id: "email",
    kind: "email",
    label: "email it to you",
    /**
     * `notify-me` first, because "email it to you" has no recipient to supply
     * — it addresses the workspace, and the workspace is always known.
     * `send-email` stays as the fallback for a deployment without the newer
     * node, but it needs an address, which is the thing this destination is
     * least able to produce reliably.
     */
    nodeTypes: ["notify-me", "send-email"],
  },
  {
    id: "display",
    kind: "display",
    label: "show it to you here",
    nodeTypes: [
      "output-text",
      "output-json",
      "output-image",
      "output-audio",
      "output-any",
    ],
  },
];

/**
 * Every destination id this deployment knows, whatever an org can reach today.
 *
 * Exported for the guard: the brief prompt's worked example hardcodes two of
 * these to show the output shape, and a renamed spec would leave it teaching a
 * dead id with nothing to notice. The example is JSON a person reads, so it
 * stays hand-written — what is checked is that the ids in it still exist.
 */
export const DESTINATION_IDS: readonly string[] = DESTINATION_SPECS.map(
  (spec) => spec.id
);

export interface AchievableDestinationsInput {
  /** `filterEligible(...).eligible` — what this org can execute right now. */
  eligible: NodeType[];
  /** The trigger the workflow will use, which decides responder availability. */
  trigger: WorkflowTrigger;
  /**
   * Providers whose OAuth credentials exist in this deployment. Absent means
   * every provider is available — the same convention `filterEligible` uses,
   * so a caller holding one optional set can pass it to both.
   */
  availableProviders?: ReadonlySet<string>;
  /**
   * The full registry and the org's context, used to tell "not connected yet"
   * apart from "cannot be reached at all".
   *
   * Without these a destination the user explicitly asked for simply vanishes
   * and something else is substituted, which is the failure mode this whole
   * feature exists to remove — just relocated from the graph to the sentence.
   */
  nodeTypes?: NodeType[];
  connectedProviders?: ReadonlySet<string>;
}

/**
 * The destinations offerable for one request, most specific first.
 *
 * Never empty: `display` survives every gate — output nodes carry no
 * subscription, no integration input and no org resource.
 */
export function achievableDestinations(
  input: AchievableDestinationsInput
): BriefDestination[] {
  const eligible = new Set(input.eligible.map((nodeType) => nodeType.type));

  // Responder types are absent from `eligible` on purpose — `filterEligible`
  // drops every trigger and responder because the server injects them rather
  // than letting the model choose. Checking them against the eligible set
  // would silently remove the one destination an http_request workflow has.
  const injected = new Set(TRIGGER_TO_NODE_TYPES[input.trigger] ?? []);

  const registry = new Map(
    (input.nodeTypes ?? []).map((nodeType) => [nodeType.type, nodeType])
  );

  /**
   * Would linking this provider be enough to make the node runnable?
   *
   * Now that capability is not gated by plan, the only thing that can stand
   * between a request and a real destination is the account itself — so the
   * answer is yes whenever the node exists and is not linked yet.
   */
  const connectingWouldWork = (spec: DestinationSpec): boolean => {
    if (!spec.provider || !input.connectedProviders) return false;
    if (input.connectedProviders.has(spec.provider)) return false;
    return spec.nodeTypes.some((type) => registry.has(type));
  };

  const destinations: BriefDestination[] = [];

  for (const spec of DESTINATION_SPECS) {
    if (spec.requiresTrigger && !spec.requiresTrigger.includes(input.trigger)) {
      continue;
    }
    if (
      spec.provider &&
      input.availableProviders &&
      !input.availableProviders.has(spec.provider)
    ) {
      continue;
    }

    const usable = spec.nodeTypes.filter(
      (type) => eligible.has(type) || injected.has(type)
    );

    if (usable.length === 0) {
      // Nothing runnable yet — but if the only thing standing in the way is an
      // account the user has not linked, that is a question worth asking
      // rather than a reason to quietly build something else.
      if (!connectingWouldWork(spec)) continue;

      destinations.push({
        id: spec.id,
        kind: spec.kind,
        ...(spec.provider ? { provider: spec.provider } : {}),
        label: spec.label,
        nodeTypes: spec.nodeTypes.filter((type) => registry.has(type)),
        requiresConnection: true,
      });
      continue;
    }

    // Provider nodes are offered even before the account is linked — the
    // build rehearses those steps — so "usable" no longer implies
    // "connected". The flag has to come from connection state itself, or the
    // brief would promise a live destination the org cannot deliver yet.
    const requiresConnection =
      spec.provider !== undefined &&
      input.connectedProviders !== undefined &&
      !input.connectedProviders.has(spec.provider);

    destinations.push({
      id: spec.id,
      kind: spec.kind,
      ...(spec.provider ? { provider: spec.provider } : {}),
      label: spec.label,
      nodeTypes: usable,
      ...(requiresConnection ? { requiresConnection: true } : {}),
    });
  }

  return destinations;
}

/**
 * The one to assume when the request does not say.
 *
 * A responder is mandatory rather than preferred: `MISSING_RESPONDER` is
 * already fatal for these triggers, so the caller has to receive something.
 * Otherwise the most direct thing that leaves the platform wins, because
 * showing a result in a tab the user has closed is the failure this is for.
 */
export function defaultDestination(
  destinations: BriefDestination[]
): BriefDestination {
  // Never assume something that would first need an account linked. The
  // assumption is what "Just try it" builds, and that button has to work
  // without sending anyone through an OAuth round trip they did not ask for.
  const ready = destinations.filter(
    (destination) => !destination.requiresConnection
  );

  const responder = ready.find((d) => d.kind === "respond");
  if (responder) return responder;

  const email = ready.find((d) => d.kind === "email");
  if (email) return email;

  return ready[ready.length - 1] ?? destinations[destinations.length - 1];
}
