import type {
  Edge,
  Workflow,
  WorkflowExecution,
  WorkflowTrigger,
} from "./workflow";
import type { Brief, BriefAnswers } from "./workflow-brief";

/**
 * Wire protocol for the workflow generator socket.
 *
 * Lives here so the API and the app agree on one definition, mirroring how
 * `ClientMessage`/`ServerMessage` are shared for the editor socket.
 */

export type GenerationPhase =
  | "briefing"
  | "planning"
  | "selecting"
  | "generating"
  | "validating"
  | "repairing"
  | "saving"
  | "running"
  | "complete";

/**
 * `awaiting` is the session sitting on a brief, waiting for a person.
 *
 * It is a distinct state rather than an idle one because a reload has to land
 * back on the sentence, and because the stall timeout must not apply to it —
 * someone reading their request back to themselves is not a hung run.
 */
export type GenerationStatus =
  | "idle"
  | "running"
  | "awaiting"
  | "done"
  | "failed";

export type GenerationErrorCode =
  | "UNREPAIRABLE"
  | "CREDITS_EXHAUSTED"
  | "MISCONFIGURED"
  | "STALLED"
  | "CANCELLED"
  | "LLM_FAILED"
  | "INTERNAL";

/** Validation finding, as surfaced to the UI. */
export interface GenerationValidationIssue {
  code: string;
  severity: "fatal" | "warning";
  message: string;
  nodeId?: string;
  edge?: Edge;
}

export interface GenerationPlan {
  title: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: string[];
}

/** One node whose outward effect was rehearsed rather than performed. */
export interface RehearsedNode {
  nodeId: string;
  /** The linked account it would have acted on, when it acts on one. */
  provider?: string;
}

/**
 * How the trial run was kept safe.
 *
 * The trial run always executes in rehearsal mode: outward writes are
 * replaced with stubs that compose everything and send nothing, and a node
 * whose integration is not bound runs on stand-in data. Nothing listed here
 * left Dafthunk — which is exactly what the outcome screen has to say, in
 * the past conditional, next to the values that would have gone out.
 */
export interface RehearsalReport {
  nodes: RehearsedNode[];
  /**
   * Providers whose steps ran on stand-in data because no account is linked.
   * Each one is a "connect it to make this live" call to action.
   */
  unconnectedProviders: string[];
}

/**
 * Version of this protocol, sent on the `session` frame.
 *
 * The `session` frame is the first thing every client receives and it already
 * resets client state, which makes it the free place to negotiate. A client
 * that reads a version above the one it was built against knows to expect
 * frames it does not understand — it must ignore them rather than treat them
 * as an error, and the server does the same in the other direction.
 */
export const GENERATOR_PROTOCOL_VERSION = 2;

export type GeneratorClientMessage =
  /** Read a request back as a brief, and wait. */
  | { type: "ask"; prompt: string }
  /** Accept the brief — answered, or skipped wholesale — and build it. */
  | { type: "resolve"; turn: number; answers: BriefAnswers }
  /** "What should be different?" — another pass on what was just built. */
  | { type: "critique"; note: string }
  /**
   * Turn the finished workflow on. Generated workflows are saved dormant —
   * their trigger bindings are blanked so nothing starts consuming the org's
   * real traffic unreviewed — and this restores them, which is the moment the
   * demo becomes the job. Only meaningful from `done` with a stored workflow.
   */
  | { type: "arm" }
  | { type: "cancel" };

export type GeneratorServerMessage =
  | {
      type: "session";
      sessionId: string;
      status: GenerationStatus;
      phase?: GenerationPhase;
      /** The request this session was started with, so a resumed page can show it. */
      prompt?: string;
      /** `GENERATOR_PROTOCOL_VERSION` of the server that sent this. */
      protocol?: number;
      /**
       * Where the built workflow lives, if this session saved one. The frame
       * log is pruned an hour after a run settles; a visitor arriving after
       * that gets no replay, and these are what let the page still point at
       * the thing that was built instead of rendering a void.
       */
      workflowId?: string;
      executionId?: string;
    }
  | { type: "phase"; phase: GenerationPhase; label: string }
  /**
   * `link` is set only when there is somewhere useful to send the reader.
   * Warnings used to all be about OAuth, so the view appended a "Manage
   * connections" link to every one of them — which became wrong advice the
   * moment a warning could be about a queue or a mailbox instead.
   *
   * `important` marks the few messages that are about the user's workspace
   * rather than about our process. "Considering 60 of 453 node types" is true
   * and useless to them; "this workspace has no mailbox" changes what they can
   * build. Only the important ones reach the main screen.
   */
  | {
      type: "log";
      level: "info" | "warn";
      message: string;
      link?: "integrations";
      important?: boolean;
    }
  /**
   * The request, read back. `turn` keys this the way `attempt` keys `graph` —
   * without it a replay holding both an original brief and a post-critique one
   * is indistinguishable from a duplicate.
   */
  | { type: "brief"; turn: number; brief: Brief }
  /**
   * Offered instead of a brief when the request was too thin to read back.
   *
   * `matched` says whether these relate to what was asked. When nothing scored
   * they are padding from the catalogue, and a screen that says "did you mean"
   * over unrelated examples reads as a product that cannot understand English.
   */
  | { type: "suggestions"; turn: number; prompts: string[]; matched: boolean }
  /**
   * The sentence the server is actually building from. Sent so the client
   * never has to re-derive it and silently disagree.
   */
  | { type: "resolved"; turn: number; sentence: string }
  | { type: "plan"; plan: GenerationPlan }
  | { type: "graph"; workflow: Workflow; attempt: number }
  | {
      type: "validation";
      attempt: number;
      issues: GenerationValidationIssue[];
    }
  /**
   * `dormant` is set when a trigger binding was blanked at save time — the
   * workflow exists but will not fire on its own until an `arm` restores it.
   * The outcome screen owes the user that fact: every screen upstream teaches
   * them to trust delegation, and ending on a draft nobody said was a draft
   * delegates the actual job back to them, unstated.
   */
  | { type: "saved"; workflowId: string; name: string; dormant?: boolean }
  /** The dormant trigger was restored; the workflow now runs on its own. */
  | { type: "armed"; workflowId: string }
  /**
   * The trial run. `sampleName` is set when the run was driven by a generated
   * example rather than by anything the user supplied — which is almost always,
   * and which the outcome screen has to say out loud. Output produced from
   * invented input is unintelligible when presented as the user's own result.
   *
   * `rehearsal` is set when the graph contains outward or unbound steps that
   * were stubbed for this run. Absent means everything ran for real.
   */
  | {
      type: "run_result";
      execution: WorkflowExecution;
      sampleName?: string;
      rehearsal?: RehearsalReport;
    }
  | {
      type: "done";
      workflowId?: string;
      executionId?: string;
      outcome: "ok" | "partial";
    }
  | {
      type: "error";
      code: GenerationErrorCode;
      message: string;
      recoverable: boolean;
    };
