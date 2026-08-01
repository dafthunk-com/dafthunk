import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

import { WorkflowError } from "./workflow-error";

interface WorkflowErrorBoundaryProps {
  readonly children: ReactNode;
  /** Changing this value resets the boundary — used to recover on navigation. */
  readonly resetKey?: string;
}

interface WorkflowErrorBoundaryState {
  error: Error | null;
  resetKey?: string;
}

/**
 * Catches render errors from the canvas subtree.
 *
 * The editor renders ~40 independently authored node widgets and field types;
 * a single one throwing (a malformed persisted value, an unexpected shape from
 * a model provider) would otherwise unmount the entire application and lose
 * unsaved work. Contained here, the rest of the page — including the socket
 * that flushes pending edits — stays alive.
 *
 * A class component because React exposes no hook equivalent for error
 * boundaries.
 */
export class WorkflowErrorBoundary extends Component<
  WorkflowErrorBoundaryProps,
  WorkflowErrorBoundaryState
> {
  state: WorkflowErrorBoundaryState = { error: null };

  static getDerivedStateFromError(
    error: Error
  ): Partial<WorkflowErrorBoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: WorkflowErrorBoundaryProps,
    state: WorkflowErrorBoundaryState
  ): Partial<WorkflowErrorBoundaryState> | null {
    if (state.resetKey !== props.resetKey) {
      return { error: null, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Workflow canvas error:", error, errorInfo.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <WorkflowError
          message={this.state.error.message || "The workflow editor crashed."}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
