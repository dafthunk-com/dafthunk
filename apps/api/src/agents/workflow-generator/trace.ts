/**
 * What each stage of a generation actually did.
 *
 * The pipeline's second output, and the one that answers a question its first
 * output cannot: not "did this work" but "where did it stop working". A
 * generation that delivers the wrong thing has passed through selection,
 * drafting, hydration, validation, saving and running, and every one of those
 * is a place the answer can go wrong in a way the next stage cannot see.
 *
 * Deliberately not `emit`. Frames are a UI contract — shaped for a React
 * reducer, carrying labels and phases and truncated previews — and the two
 * harnesses were reduced to scraping them for pipeline state, which meant they
 * could only ever measure the two endpoints: a graph came out, and it did or
 * did not deliver. Everything between those was invisible, and a drop in the
 * second number could not be attributed to a stage.
 *
 * Costs an array of small objects per generation. The Durable Object ignores
 * it; the harnesses are built on it.
 */

/** A stage that ran. `ok` is the column to scan first. */
export type TraceEntry =
  | SelectTrace
  | DraftTrace
  | HydrateTrace
  | ValidateTrace
  | SaveTrace
  | RunTrace;

/**
 * What the model was allowed to see.
 *
 * The stage nothing downstream can recover from, and the one with no visible
 * symptom of its own: a node type that was never offered surfaces three stages
 * later as an invented type in a repair round, or as a graph built out of
 * something that does not fit. `offeredTypes` is carried in full because the
 * question worth asking of a bad generation is almost always "was the right
 * node even on the table".
 */
export interface SelectTrace {
  stage: "select";
  ok: boolean;
  /** Types in the live registry, before any narrowing. */
  catalog: number;
  /** Types actually shown to the model. */
  offeredTypes: string[];
  /** Types the destination promised, which are forced past keyword ranking. */
  required: string[];
  /** Of those, any that could not be offered at all — always a defect. */
  missingRequired: string[];
  /** Capabilities the request reached for and could not have. */
  withheldProviders: string[];
  withheldResources: string[];
  /**
   * Providers offered without a connected account — their steps rehearse.
   * Here to make catalog dilution measurable across runs.
   */
  unconnectedProviders?: string[];
  /**
   * Characters the offered catalog renders to — dilution in what it costs.
   *
   * `offeredTypes.length` counts a fifteen-port node and a `text-input` the
   * same, and they differ by roughly six times. Since the catalog is most of
   * the prompt, the count alone cannot answer whether a run got expensive
   * because it offered more types or because the projection got wordier.
   */
  catalogChars: number;
}

/** Which prompt produced a draft, since the three have different failure modes. */
export type DraftKind = "initial" | "repair" | "run-repair";

export interface DraftTrace {
  stage: "draft";
  ok: boolean;
  attempt: number;
  kind: DraftKind;
  /** Why the response could not be read, when it could not. */
  reason?: string;
  /**
   * What the call cost on the way in, beside what it produced.
   *
   * `outputTokens` alone made a repair round look nearly free: every round
   * resends the whole prompt — a catalog, a grounding section and two worked
   * examples — so the input is the larger half and it grows with the
   * projection. It was already sitting on `GenerateResult` and being dropped
   * here, which left a change that doubled the prompt visible only on the bill.
   */
  inputTokens: number;
  outputTokens: number;
  /** Characters of system prompt — the number a projection change moves. */
  systemChars: number;
  /** Node types the model named, before any of them are checked to exist. */
  types: string[];
}

/**
 * Draft → graph. The stage that silently discards.
 *
 * A node whose type does not exist is dropped and reported, but the graph
 * carries on without it — so a draft of eight nodes can become a graph of three
 * that validates perfectly and does a third of the job.
 */
export interface HydrateTrace {
  stage: "hydrate";
  ok: boolean;
  attempt: number;
  /** Nodes the model emitted. */
  drafted: number;
  /** Node types in the built graph, including the server's injected trigger. */
  types: string[];
  /** Types named by the model that do not exist, and were therefore dropped. */
  droppedTypes: string[];
  boundResources: string[];
  rejectedTools: string[];
}

export interface ValidateTrace {
  stage: "validate";
  ok: boolean;
  attempt: number;
  /** Codes only: the messages are for the model, the codes are for counting. */
  fatal: string[];
  warnings: string[];
}

export interface SaveTrace {
  stage: "save";
  ok: boolean;
  workflowId: string;
  nodes: number;
  edges: number;
  examples: number;
}

export interface RunTrace {
  stage: "run";
  ok: boolean;
  attempt: number;
  status: string;
  failed: Array<{ nodeId: string; type?: string; error?: string }>;
  /** Set on a repair run: whether it beat the run before it, and why not. */
  adopted?: boolean;
}

/**
 * The first stage that did not do its job.
 *
 * The whole point of the trace, reduced to one line. A sample that ran cleanly
 * and delivered nonsense has a stage where it went wrong, and reading it off
 * the trace is what turns a pass rate into a diagnosis.
 *
 * Returns undefined when every stage did its job — which, for a sample that
 * still failed, is itself the finding: nothing structural went wrong and the
 * fault is in what the model wrote.
 */
export function firstFailure(trace: TraceEntry[]): TraceEntry | undefined {
  return trace.find((entry) => !entry.ok);
}

/** One line per stage, for a harness report that has to be read in a log. */
export function summarize(entry: TraceEntry): string {
  switch (entry.stage) {
    case "select":
      return `select: ${entry.offeredTypes.length}/${entry.catalog} offered (${Math.round(entry.catalogChars / 1000)}k chars)${
        entry.missingRequired.length
          ? `, REQUIRED MISSING: ${entry.missingRequired.join(", ")}`
          : ""
      }${
        entry.withheldProviders.length
          ? `, withheld: ${entry.withheldProviders.join(", ")}`
          : ""
      }`;
    case "draft":
      return `draft[${entry.attempt}] ${entry.kind}: ${
        entry.ok
          ? `${entry.types.length} nodes named`
          : // Not "UNREADABLE": a round is discarded either because it could
            // not be parsed or because it parsed and named nothing, and those
            // are the two outcomes `RevisionOutcome` exists to keep apart. The
            // label claimed the first for both, which sent a reader of the
            // 2026-08-13 sweep looking for a decoding fault that was not there.
            `DISCARDED ${entry.reason ?? ""}`
      } (${entry.inputTokens}in/${entry.outputTokens}out, ${entry.systemChars} system chars)`;
    case "hydrate":
      return `hydrate[${entry.attempt}]: ${entry.drafted} drafted -> ${entry.types.length} built${
        entry.droppedTypes.length
          ? `, DROPPED: ${entry.droppedTypes.join(", ")}`
          : ""
      }`;
    case "validate":
      return `validate[${entry.attempt}]: ${
        entry.fatal.length ? `fatal ${entry.fatal.join(", ")}` : "clean"
      }`;
    case "save":
      return `save: ${entry.nodes} nodes, ${entry.edges} edges, ${entry.examples} examples`;
    case "run":
      return `run[${entry.attempt}]: ${entry.status}${
        entry.failed.length
          ? ` — ${entry.failed.map((node) => `${node.nodeId}(${node.type ?? "?"})`).join(", ")}`
          : ""
      }${entry.adopted === false ? " [not adopted]" : ""}`;
  }
}
