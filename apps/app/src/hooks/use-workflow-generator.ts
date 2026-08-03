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

export interface GenerationState {
  status: GenerationStatus;
  phase?: GenerationPhase;
  plan?: GenerationPlan;
  workflow?: Workflow;
  attempt: number;
  issues: GenerationValidationIssue[];
  logs: GenerationLogEntry[];
  workflowId?: string;
  execution?: WorkflowExecution;
  outcome?: "ok" | "partial";
  error?: { message: string; recoverable: boolean };
}

const INITIAL: GenerationState = {
  status: "idle",
  attempt: 0,
  issues: [],
  logs: [],
};

/**
 * Reduces the generator's frame stream into render state.
 *
 * Frames are replayed verbatim by the server on reconnect, so the reducer has
 * to be idempotent in effect: every frame either overwrites a field or appends
 * to a list that is reset when a new run starts.
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
      return { ...INITIAL, status: frame.status, phase: frame.phase };
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
      return { ...state, workflow: frame.workflow, attempt: frame.attempt };
    case "validation":
      return { ...state, issues: frame.issues };
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

export function useWorkflowGenerator(orgId: string) {
  const [state, setState] = useState<GenerationState>(INITIAL);
  const socketRef = useRef<WorkflowGeneratorWebSocket | null>(null);

  // Without this the socket outlives the page: `shouldReconnect` stays true, so
  // navigating away leaves it reconnecting and replaying the log into a
  // component that no longer exists.
  useEffect(() => () => socketRef.current?.disconnect(), []);

  const generate = useCallback(
    (prompt: string) => {
      if (!orgId || !prompt.trim()) return;

      socketRef.current?.disconnect();
      setState({ ...INITIAL, status: "running" });

      // A fresh session id per attempt: the server treats a session as
      // single-use, so reusing one would replay the old run instead.
      const sessionId = crypto.randomUUID();
      socketRef.current = connectWorkflowGeneratorWS(orgId, sessionId, {
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
      socketRef.current.start(prompt);
    },
    [orgId]
  );

  const cancel = useCallback(() => {
    socketRef.current?.cancel();
  }, []);

  const reset = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setState(INITIAL);
  }, []);

  return { state, generate, cancel, reset };
}
