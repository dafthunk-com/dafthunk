import type {
  Brief,
  BriefAnswers,
  GenerationErrorCode,
  GenerationPhase,
  GenerationPlan,
  GenerationStatus,
  GeneratorServerMessage,
  RehearsalReport,
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  GeneratorConnectionStatus,
  WorkflowGeneratorWebSocket,
} from "@/services/workflow-generator-service";
import { connectWorkflowGeneratorWS } from "@/services/workflow-generator-service";

/**
 * A generator session, reduced to what the person needs to see.
 *
 * This is now the only view of one. An earlier developer page consumed the same
 * frame stream and rendered all of it — plan, validation issues, attempt
 * history, every log line — which is why the reducer below is explicit about
 * what it drops rather than spreading frames wholesale.
 */

export interface BriefState {
  status: GenerationStatus;
  phase?: GenerationPhase;
  /**
   * The server's own words for what it is doing right now — "Fixing 2
   * problem(s)", "Changing it so it does not do that". Better narration than
   * any static map, and it was being written and discarded for a while.
   */
  phaseLabel?: string;
  /**
   * The phases this turn has been through, in the server's own words.
   *
   * An accruing checked list converts elapsed time into visible progress —
   * one mutating line cannot: when two phases share copy, or a long phase
   * sits still, the single line is indistinguishable from a stall.
   */
  phaseTrail: string[];
  /**
   * Transport, kept apart from `status` on purpose: a dropped socket is not a
   * failed generation. The server holds the frame log for an hour and replays
   * it on reconnect, so while this is "reconnecting" the screen stays exactly
   * where it is, and "lost" is an invitation to reattach — never a verdict on
   * the build.
   */
  connection: GeneratorConnectionStatus;
  /** A better explanation than "lost", when there is one (the rate limiter). */
  connectionDetail?: string;
  /**
   * A cancel was asked for and no terminal frame has landed yet. The pipeline
   * polls its flag between model calls, so this can be true for a while — and
   * a button that does nothing visible for thirty seconds gets clicked twice
   * and then distrusted.
   */
  cancelling: boolean;
  /** True once the server has described the session, so "expired" is knowable. */
  sessionLoaded: boolean;
  /**
   * True once any frame beyond `session` has arrived — the server had a log
   * to replay, or a live turn is speaking. False after `session` alone is
   * what a settled visit past frame pruning looks like, whatever fields the
   * replay would have carried.
   */
  replayed: boolean;
  /** The request this session was opened with; present when resuming. */
  prompt?: string;
  /** Highest turn seen. Frames from an earlier turn are stale by construction. */
  turn: number;
  brief?: Brief;
  suggestions?: string[];
  /** Whether the suggestions relate to the request, or are catalogue padding. */
  suggestionsMatched?: boolean;
  /** What it intends to build, shown during the wait. */
  plan?: GenerationPlan;
  /** Things about this workspace the person needs to know. */
  notes: BriefNote[];
  /** The sentence the server is building from, echoed rather than re-derived. */
  sentence?: string;
  workflowId?: string;
  /**
   * The saved workflow will not fire on its own: its trigger binding was
   * blanked at save. This is what the commitment moment exists to say — a
   * flow that briefs, builds and demos the job, then ends without the job
   * existing, has converted its whole arc into a draft nobody asked for.
   */
  dormant?: boolean;
  /** The user turned it on, and the server confirmed the restore. */
  armed?: boolean;
  /**
   * The stored run, so the screen can link to it.
   *
   * Distinct from `execution`, which is the trimmed preview the frame carried:
   * that one has had node inputs stripped and long values cut, and the record
   * behind this id is the whole thing.
   */
  executionId?: string;
  workflow?: Workflow;
  execution?: WorkflowExecution;
  /** Name of the invented example the trial run was fed, when there was one. */
  sampleName?: string;
  /**
   * What the trial run stubbed instead of performing. Present when the graph
   * has outward or unbound steps — the outcome screen turns it into "would
   * have sent" phrasing and the connect calls to action.
   */
  rehearsal?: RehearsalReport;
  outcome?: "ok" | "partial";
  error?: {
    message: string;
    recoverable: boolean;
    /** Set for server-reported errors; absent for transport failures. */
    code?: GenerationErrorCode;
  };
}

/** One thing worth telling the person about their own workspace. */
export interface BriefNote {
  level: "info" | "warn";
  message: string;
  link?: "integrations";
}

export const INITIAL_BRIEF_STATE: BriefState = {
  status: "idle",
  sessionLoaded: false,
  replayed: false,
  turn: 0,
  notes: [],
  phaseTrail: [],
  connection: "connected",
  cancelling: false,
};

/** How much of the trail is worth showing; repair loops can run long. */
const PHASE_TRAIL_LIMIT = 6;

/**
 * The optimistic label between a click and the server's first frame.
 * Never joins the trail — it is a claim about our intent, not a step done.
 *
 * Only for the moves that continue a session, where the phase the server will
 * announce is not the one on screen. An opening `ask` needs no label: it is
 * already in `briefing`, and the rail's copy for that phase says so.
 */
const SENDING_LABEL = "Sending…";

/**
 * Reduces the frame stream into render state.
 *
 * Frames are replayed verbatim on reconnect, so this has to be idempotent.
 * Every field is either overwritten or gated on `turn`, and the `session`
 * frame — which always precedes a replay — resets everything.
 */
export function reduce(
  state: BriefState,
  frame: GeneratorServerMessage
): BriefState {
  const next = applyFrame(state, frame);
  // Any frame past the `session` reset proves the log had content.
  return frame.type === "session" || next.replayed
    ? next
    : { ...next, replayed: true };
}

function applyFrame(
  state: BriefState,
  frame: GeneratorServerMessage
): BriefState {
  switch (frame.type) {
    case "session":
      return {
        ...INITIAL_BRIEF_STATE,
        sessionLoaded: true,
        status: frame.status,
        phase: frame.phase,
        prompt: frame.prompt,
        // The server keeps these past the hour after which the frame log is
        // pruned — a returning visitor gets no replay, and this is what still
        // points at the workflow the session built.
        workflowId: frame.workflowId,
        executionId: frame.executionId,
      };

    case "brief":
      if (frame.turn < state.turn) return state;
      return {
        ...state,
        turn: frame.turn,
        brief: frame.brief,
        suggestions: undefined,
        status: "awaiting",
      };

    case "suggestions":
      if (frame.turn < state.turn) return state;
      return {
        ...state,
        turn: frame.turn,
        suggestions: frame.prompts,
        suggestionsMatched: frame.matched,
        brief: undefined,
        status: "awaiting",
      };

    case "resolved":
      if (frame.turn < state.turn) return state;
      // A new turn's result supersedes the last one's — otherwise a critique
      // would render its correction beside the thing it corrected.
      return {
        ...state,
        turn: frame.turn,
        sentence: frame.sentence,
        execution: undefined,
        // Cleared with the execution it identifies. A critique re-runs the
        // workflow, and a link left pointing at the previous run would show the
        // result the user just asked to have changed.
        executionId: undefined,
        // The report describes that run; the rebuild will carry its own.
        rehearsal: undefined,
        outcome: undefined,
        // A new turn re-saves through hydration, which disarms again — an
        // earlier "it's on" would be a stale promise over a workflow the
        // rebuild just turned back off.
        dormant: undefined,
        armed: undefined,
      };

    case "phase": {
      // The line being replaced joins the trail as a step done. "complete" is
      // an ending rather than a step, a duplicate frame is a stutter, and the
      // optimistic "Sending…" was never the server doing anything.
      const finished =
        frame.label !== state.phaseLabel &&
        state.phaseLabel &&
        state.phaseLabel !== SENDING_LABEL
          ? state.phaseLabel
          : undefined;
      const trail =
        frame.phase === "complete" || !finished
          ? state.phaseTrail
          : [...state.phaseTrail, finished];

      return {
        ...state,
        phase: frame.phase,
        phaseLabel: frame.label,
        phaseTrail: trail.slice(-PHASE_TRAIL_LIMIT),
        status: frame.phase === "complete" ? state.status : "running",
      };
    }

    case "graph":
      return { ...state, workflow: frame.workflow };

    case "saved":
      return { ...state, workflowId: frame.workflowId, dormant: frame.dormant };

    case "armed":
      return { ...state, armed: true };

    case "run_result":
      return {
        ...state,
        execution: frame.execution,
        sampleName: frame.sampleName,
        rehearsal: frame.rehearsal,
      };

    case "done":
      return {
        ...state,
        status: "done",
        cancelling: false,
        outcome: frame.outcome,
        workflowId: frame.workflowId ?? state.workflowId,
        executionId: frame.executionId ?? state.executionId,
      };

    case "error":
      return {
        ...state,
        status: "failed",
        cancelling: false,
        error: {
          message: frame.message,
          recoverable: frame.recoverable,
          code: frame.code,
        },
      };

    // What it is about to do, in its own words. Worth showing: the build takes
    // the better part of a minute, and "Wiring it up" alone gives someone no
    // way to tell a good attempt from a wrong one until it is finished.
    case "plan":
      return { ...state, plan: frame.plan };

    // Only the messages about *their* workspace. The rest — how many node
    // types were considered, which example the run used — is our process, and
    // showing it is what made the old page read as a compiler transcript.
    case "log":
      if (!frame.important) return state;
      return {
        ...state,
        notes: [
          ...state.notes,
          {
            level: frame.level,
            message: frame.message,
            ...(frame.link ? { link: frame.link } : {}),
          },
        ],
      };

    // `validation` stays the debug channel's business.
    default:
      return state;
  }
}

export interface UseWorkflowBriefOptions {
  sessionId?: string;
  onSessionStarted?: (sessionId: string) => void;
}

export function useWorkflowBrief(
  orgId: string,
  options: UseWorkflowBriefOptions = {}
) {
  const { sessionId, onSessionStarted } = options;

  const [state, setState] = useState<BriefState>(INITIAL_BRIEF_STATE);
  const socketRef = useRef<WorkflowGeneratorWebSocket | null>(null);
  const attachedRef = useRef<string | null>(null);

  const connect = useCallback(
    (session: string) => {
      socketRef.current?.disconnect();
      attachedRef.current = session;

      socketRef.current = connectWorkflowGeneratorWS(orgId, session, {
        onFrame: (frame) => setState((current) => reduce(current, frame)),
        // Transport news changes the transport field and nothing else. The
        // old behaviour — mapping an exhausted retry to a terminal `failed` —
        // told people a build the server was still running (or had finished)
        // was gone, over a button that then actually destroyed the session.
        onConnectionChange: (connection, detail) =>
          setState((current) => ({
            ...current,
            connection,
            connectionDetail: detail,
          })),
      });

      return socketRef.current;
    },
    [orgId]
  );

  // Attaching to a session named in the URL never sends anything: the server
  // replays whatever state it is in, including a brief waiting to be answered.
  useEffect(() => {
    if (!orgId || !sessionId) return;
    if (attachedRef.current === sessionId) return;
    connect(sessionId);
  }, [orgId, sessionId, connect]);

  useEffect(
    () => () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      attachedRef.current = null;
    },
    []
  );

  const ask = useCallback(
    (prompt: string) => {
      if (!orgId || !prompt.trim()) return;

      setState((current) => ({
        ...current,
        status: "running",
        phase: "briefing",
        // No label of its own: the phase is already the one the server is
        // about to announce, so the rail's copy for `briefing` covers the wait
        // and the real frame repaints the same words. Naming this stretch
        // separately made one wait read as two steps, the second of which was
        // about our plumbing rather than their request.
        phaseLabel: undefined,
        phaseTrail: [],
        cancelling: false,
        sessionLoaded: true,
        brief: undefined,
        suggestions: undefined,
        sentence: undefined,
        execution: undefined,
        executionId: undefined,
        rehearsal: undefined,
        outcome: undefined,
        error: undefined,
      }));

      // Reuse the live socket when there is one: asking again after a result
      // is another turn in the same session, not a new session.
      if (socketRef.current && attachedRef.current) {
        socketRef.current.ask(prompt);
        return;
      }

      // This id is the workflow id: the server's agent is keyed by it, and
      // the workflow the session builds is saved under it.
      const session = crypto.randomUUID();
      connect(session).ask(prompt);
      onSessionStarted?.(session);
    },
    [orgId, connect, onSessionStarted]
  );

  const resolve = useCallback(
    (answers: BriefAnswers) => {
      setState((current) => ({
        ...current,
        status: "running",
        phaseLabel: SENDING_LABEL,
        phaseTrail: [],
      }));
      socketRef.current?.resolve(state.turn, answers);
    },
    [state.turn]
  );

  const critique = useCallback((note: string) => {
    if (!note.trim()) return;
    setState((current) => ({
      ...current,
      status: "running",
      phaseLabel: SENDING_LABEL,
      phaseTrail: [],
    }));
    socketRef.current?.critique(note);
  }, []);

  /**
   * Ask the run to stop. Acknowledged locally at once: the pipeline polls its
   * cancel flag between model calls, so the real stop can be half a minute
   * out, and the screen has to say "heard you" in the meantime.
   */
  const cancel = useCallback(() => {
    setState((current) =>
      current.status === "running" ? { ...current, cancelling: true } : current
    );
    socketRef.current?.cancel();
  }, []);

  /** One click to a fresh retry budget — never a new session. */
  const reconnect = useCallback(() => {
    setState((current) => ({ ...current, connection: "reconnecting" }));
    socketRef.current?.reconnect();
  }, []);

  /** Turn the saved workflow on. Confirmed by the `armed` frame, not locally. */
  const arm = useCallback(() => {
    socketRef.current?.arm();
  }, []);

  const reset = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    attachedRef.current = null;
    setState(INITIAL_BRIEF_STATE);
  }, []);

  return {
    state,
    ask,
    resolve,
    critique,
    cancel,
    reconnect,
    arm,
    reset,
  };
}
