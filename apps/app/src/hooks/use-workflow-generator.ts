import type {
  GenerationPhase,
  GenerationPlan,
  GenerationStatus,
  GenerationValidationIssue,
  GeneratorServerMessage,
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";
import { useCallback, useEffect, useRef, useState } from "react";

import type { WorkflowGeneratorWebSocket } from "@/services/workflow-generator-service";
import { connectWorkflowGeneratorWS } from "@/services/workflow-generator-service";

export interface GenerationLogEntry {
  level: "info" | "warn";
  message: string;
}

/**
 * One pass the generator made at producing a valid graph. Attempt 0 is the
 * first draft; anything after it is a repair round. Kept as history rather than
 * overwritten so the user can see what the agent tried and why it retried.
 */
export interface GenerationAttempt {
  attempt: number;
  workflow?: Workflow;
  issues: GenerationValidationIssue[];
}

export interface GenerationState {
  status: GenerationStatus;
  phase?: GenerationPhase;
  /**
   * True once the server has described the session. Distinguishes "not yet
   * connected" from "connected, and this session holds nothing" — which is what
   * an expired session looks like after its storage is reclaimed.
   */
  sessionLoaded: boolean;
  /** The request this run was started with; present when resuming a session. */
  prompt?: string;
  plan?: GenerationPlan;
  attempts: GenerationAttempt[];
  logs: GenerationLogEntry[];
  workflowId?: string;
  execution?: WorkflowExecution;
  outcome?: "ok" | "partial";
  error?: { message: string; recoverable: boolean };
}

const INITIAL: GenerationState = {
  status: "idle",
  sessionLoaded: false,
  attempts: [],
  logs: [],
};

/** The graph and issues from the newest attempt. */
export function latestAttempt(
  state: GenerationState
): GenerationAttempt | undefined {
  return state.attempts[state.attempts.length - 1];
}

/** Merges a partial attempt into the history, keyed by attempt number. */
function upsertAttempt(
  attempts: GenerationAttempt[],
  attempt: number,
  patch: Partial<GenerationAttempt>
): GenerationAttempt[] {
  const index = attempts.findIndex((entry) => entry.attempt === attempt);
  if (index === -1) {
    return [...attempts, { attempt, issues: [], ...patch }];
  }
  const next = [...attempts];
  next[index] = { ...next[index], ...patch };
  return next;
}

/**
 * Reduces the generator's frame stream into render state.
 *
 * Frames are replayed verbatim by the server on reconnect, so the reducer has
 * to be idempotent in effect: every frame either overwrites a field, or merges
 * into a list keyed by attempt, or appends to a list that the `session` frame
 * resets.
 */
function reduce(
  state: GenerationState,
  frame: GeneratorServerMessage
): GenerationState {
  switch (frame.type) {
    // A session frame always precedes a replay of the whole log, so anything
    // accumulated from a previous connection is discarded here. Without this a
    // reconnect duplicates every log line.
    case "session":
      return {
        ...INITIAL,
        sessionLoaded: true,
        status: frame.status,
        phase: frame.phase,
        prompt: frame.prompt,
      };
    case "phase":
      return {
        ...state,
        phase: frame.phase,
        status: frame.phase === "complete" ? state.status : "running",
      };
    case "log":
      return {
        ...state,
        logs: [...state.logs, { level: frame.level, message: frame.message }],
      };
    case "plan":
      return { ...state, plan: frame.plan };
    case "graph":
      return {
        ...state,
        attempts: upsertAttempt(state.attempts, frame.attempt, {
          workflow: frame.workflow,
        }),
      };
    case "validation":
      return {
        ...state,
        attempts: upsertAttempt(state.attempts, frame.attempt, {
          issues: frame.issues,
        }),
      };
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
    default:
      return state;
  }
}

export interface UseWorkflowGeneratorOptions {
  /**
   * Session to attach to. When set, the hook connects and lets the server
   * replay the run instead of starting a new one — this is what makes a
   * generation survive leaving the page.
   */
  sessionId?: string;
  /** Called with a freshly minted session id so the caller can put it in the URL. */
  onSessionStarted?: (sessionId: string) => void;
}

export function useWorkflowGenerator(
  orgId: string,
  options: UseWorkflowGeneratorOptions = {}
) {
  const { sessionId, onSessionStarted } = options;

  const [state, setState] = useState<GenerationState>(INITIAL);
  const socketRef = useRef<WorkflowGeneratorWebSocket | null>(null);
  /** The session the live socket is attached to, to avoid reconnecting to it. */
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
                    message: "Lost connection to the generator.",
                    recoverable: true,
                  },
                }
          ),
      });

      return socketRef.current;
    },
    [orgId]
  );

  // Attach to the session named in the URL. No `start` is sent — the server
  // replays a finished or in-flight run, and a duplicate start would be
  // ignored anyway.
  useEffect(() => {
    if (!orgId || !sessionId) return;
    if (attachedRef.current === sessionId) return;
    connect(sessionId);
  }, [orgId, sessionId, connect]);

  // Without this the socket outlives the page: `shouldReconnect` stays true, so
  // navigating away leaves it reconnecting and replaying the log into a
  // component that no longer exists.
  useEffect(
    () => () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      attachedRef.current = null;
    },
    []
  );

  const generate = useCallback(
    (prompt: string) => {
      if (!orgId || !prompt.trim()) return;

      setState({ ...INITIAL, sessionLoaded: true, status: "running" });

      // A fresh session per run: the server treats one as single-use, so
      // reusing an id would replay the previous run instead of starting.
      const session = crypto.randomUUID();
      connect(session).start(prompt);
      onSessionStarted?.(session);
    },
    [orgId, connect, onSessionStarted]
  );

  const cancel = useCallback(() => {
    socketRef.current?.cancel();
  }, []);

  const reset = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    attachedRef.current = null;
    setState(INITIAL);
  }, []);

  return { state, generate, cancel, reset };
}
