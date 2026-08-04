import type {
  Brief,
  BriefAnswers,
  GenerationPhase,
  GenerationStatus,
  GeneratorServerMessage,
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";
import { useCallback, useEffect, useRef, useState } from "react";

import type { WorkflowGeneratorWebSocket } from "@/services/workflow-generator-service";
import { connectWorkflowGeneratorWS } from "@/services/workflow-generator-service";

/**
 * The brief flow's view of a generator session.
 *
 * Deliberately not an extension of `useWorkflowGenerator`. That hook backs a
 * shipped debug page and models one run with no user input in the middle; this
 * one models a conversation with two places a person can intervene. Sharing a
 * reducer between them would mean every change to either risked the other, for
 * the sake of about sixty lines.
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
  /** The sentence the server is building from, echoed rather than re-derived. */
  sentence?: string;
  workflowId?: string;
  workflow?: Workflow;
  execution?: WorkflowExecution;
  outcome?: "ok" | "partial";
  error?: { message: string; recoverable: boolean };
}

const INITIAL: BriefState = {
  status: "idle",
  sessionLoaded: false,
  turn: 0,
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
      };

    case "graph":
      return { ...state, workflow: frame.workflow };

    case "saved":
      return { ...state, workflowId: frame.workflowId };

    case "run_result":
      return { ...state, execution: frame.execution };

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

    // `plan`, `validation` and `log` are the debug page's business. Ignoring
    // them here is what keeps this screen free of internals.
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

  const cancel = useCallback(() => socketRef.current?.cancel(), []);

  const reset = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    attachedRef.current = null;
    setState(INITIAL);
  }, []);

  return { state, ask, resolve, critique, cancel, reset };
}
