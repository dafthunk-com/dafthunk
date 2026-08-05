import type {
  Brief,
  BriefAnswers,
  GenerationPhase,
  GenerationPlan,
  GenerationStatus,
  GeneratorServerMessage,
  OutwardAction,
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";
import { useCallback, useEffect, useRef, useState } from "react";

import type { WorkflowGeneratorWebSocket } from "@/services/workflow-generator-service";
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
  /** True once the server has described the session, so "expired" is knowable. */
  sessionLoaded: boolean;
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
  workflow?: Workflow;
  execution?: WorkflowExecution;
  /** Name of the invented example the trial run was fed, when there was one. */
  sampleName?: string;
  /**
   * The outward steps waiting on a decision. Present only while the run is
   * held, and cleared the moment one is given — a stale list here would ask
   * about steps that have already run.
   */
  pendingActions?: OutwardAction[];
  outcome?: "ok" | "partial";
  error?: { message: string; recoverable: boolean };
}

/** One thing worth telling the person about their own workspace. */
export interface BriefNote {
  level: "info" | "warn";
  message: string;
  link?: "integrations";
}

const INITIAL: BriefState = {
  status: "idle",
  sessionLoaded: false,
  turn: 0,
  notes: [],
};

/**
 * Reduces the frame stream into render state.
 *
 * Frames are replayed verbatim on reconnect, so this has to be idempotent.
 * Every field is either overwritten or gated on `turn`, and the `session`
 * frame — which always precedes a replay — resets everything.
 */
function reduce(state: BriefState, frame: GeneratorServerMessage): BriefState {
  switch (frame.type) {
    case "session":
      return {
        ...INITIAL,
        sessionLoaded: true,
        status: frame.status,
        phase: frame.phase,
        prompt: frame.prompt,
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
        outcome: undefined,
      };

    case "phase":
      return {
        ...state,
        phase: frame.phase,
        status: frame.phase === "complete" ? state.status : "running",
        // Any phase after the question means the question has been answered.
        // Leaving the list up would keep asking about steps already taken.
        ...(frame.phase === "approving" ? {} : { pendingActions: undefined }),
      };

    case "graph":
      return { ...state, workflow: frame.workflow };

    case "saved":
      return { ...state, workflowId: frame.workflowId };

    case "approval_required":
      return { ...state, pendingActions: frame.actions, status: "awaiting" };

    case "run_result":
      return {
        ...state,
        execution: frame.execution,
        sampleName: frame.sampleName,
      };

    case "done":
      return {
        ...state,
        status: "done",
        outcome: frame.outcome,
        workflowId: frame.workflowId ?? state.workflowId,
      };

    case "error":
      return {
        ...state,
        status: "failed",
        error: { message: frame.message, recoverable: frame.recoverable },
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

  const [state, setState] = useState<BriefState>(INITIAL);
  const socketRef = useRef<WorkflowGeneratorWebSocket | null>(null);
  const attachedRef = useRef<string | null>(null);

  const connect = useCallback(
    (session: string) => {
      socketRef.current?.disconnect();
      attachedRef.current = session;

      socketRef.current = connectWorkflowGeneratorWS(orgId, session, {
        onFrame: (frame) => setState((current) => reduce(current, frame)),
        onConnectionError: () =>
          setState((current) =>
            current.status === "done"
              ? current
              : {
                  ...current,
                  status: "failed",
                  error: {
                    message: "Lost connection.",
                    recoverable: true,
                  },
                }
          ),
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
        sessionLoaded: true,
        brief: undefined,
        suggestions: undefined,
        sentence: undefined,
        execution: undefined,
        outcome: undefined,
        error: undefined,
      }));

      // Reuse the live socket when there is one: asking again after a result
      // is another turn in the same session, not a new session.
      if (socketRef.current && attachedRef.current) {
        socketRef.current.ask(prompt);
        return;
      }

      const session = crypto.randomUUID();
      connect(session).ask(prompt);
      onSessionStarted?.(session);
    },
    [orgId, connect, onSessionStarted]
  );

  const resolve = useCallback(
    (answers: BriefAnswers) => {
      setState((current) => ({ ...current, status: "running" }));
      socketRef.current?.resolve(state.turn, answers);
    },
    [state.turn]
  );

  const critique = useCallback((note: string) => {
    if (!note.trim()) return;
    setState((current) => ({ ...current, status: "running" }));
    socketRef.current?.critique(note);
  }, []);

  /** Let the outward steps run. */
  const approve = useCallback(() => {
    setState((current) => ({
      ...current,
      status: "running",
      pendingActions: undefined,
    }));
    socketRef.current?.approve();
  }, []);

  /** Refuse, and say why — the reason is what the correction is built from. */
  const decline = useCallback((reason: string) => {
    if (!reason.trim()) return;
    setState((current) => ({
      ...current,
      status: "running",
      pendingActions: undefined,
    }));
    socketRef.current?.decline(reason);
  }, []);

  const cancel = useCallback(() => socketRef.current?.cancel(), []);

  const reset = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    attachedRef.current = null;
    setState(INITIAL);
  }, []);

  return { state, ask, resolve, critique, approve, decline, cancel, reset };
}
