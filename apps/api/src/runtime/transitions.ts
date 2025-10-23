import type { WorkflowExecutionStatus } from "@dafthunk/types";

import type { ExecutionState } from "./types";

/**
 * Explicit state transition functions for workflow execution.
 * Centralizes all status changes to make state flow visible and auditable.
 *
 * State Flow:
 *
 *   submitted → (credit check) → exhausted [TERMINAL]
 *            ↓
 *         executing → (all nodes complete) → completed [TERMINAL]
 *                  ↓
 *                error [TERMINAL]
 *
 * All transitions log in development mode for debugging.
 */
export class StateTransitions {
  constructor(private isDevelopment: boolean = false) {}

  /**
   * Initial state when workflow execution is created.
   */
  toSubmitted(state: ExecutionState): ExecutionState {
    this.logTransition(state.status, "submitted");
    return { ...state, status: "submitted" };
  }

  /**
   * Transition when insufficient compute credits available.
   * Terminal state - execution stops.
   */
  toExhausted(state: ExecutionState): ExecutionState {
    this.logTransition(state.status, "exhausted");
    return { ...state, status: "exhausted" };
  }

  /**
   * Transition when validation passes and execution begins.
   */
  toExecuting(state: ExecutionState): ExecutionState {
    this.logTransition(state.status, "executing");
    return { ...state, status: "executing" };
  }

  /**
   * Transition when all nodes processed successfully (no errors).
   * Terminal state - execution complete.
   */
  toCompleted(state: ExecutionState): ExecutionState {
    this.logTransition(state.status, "completed");
    return { ...state, status: "completed" };
  }

  /**
   * Transition when workflow encounters an error.
   * Terminal state - execution failed.
   */
  toError(state: ExecutionState): ExecutionState {
    this.logTransition(state.status, "error");
    return { ...state, status: "error" };
  }

  /**
   * Generic transition to any status.
   * Use specific transition functions above when possible.
   */
  toStatus(state: ExecutionState, status: WorkflowExecutionStatus): ExecutionState {
    this.logTransition(state.status, status);
    return { ...state, status };
  }

  /**
   * Logs state transitions in development mode.
   */
  private logTransition(
    from: WorkflowExecutionStatus,
    to: WorkflowExecutionStatus
  ): void {
    if (this.isDevelopment && from !== to) {
      console.log(`[State Transition] ${from} → ${to}`);
    }
  }
}
