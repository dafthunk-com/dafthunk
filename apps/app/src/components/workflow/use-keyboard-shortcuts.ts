import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { useEffect, useRef } from "react";

import type { WorkflowEdgeType, WorkflowNodeType } from "./workflow-types";

interface UseKeyboardShortcutsProps {
  disabled: boolean;
  selectedNodes: ReactFlowNode<WorkflowNodeType>[];
  selectedEdges: ReactFlowEdge<WorkflowEdgeType>[];
  hasClipboardData: boolean;
  copySelected: () => void;
  cutSelected: () => void;
  pasteFromClipboard: () => void;
  duplicateSelected: () => void;
  onAction?: () => void;
  nodeCount: number;
}

/**
 * True when the event came from somewhere the user is typing, or from inside
 * a modal. Either way the canvas shortcuts must stay out of the way: the
 * editor's dialogs contain their own text fields, code editors and forms.
 */
function shouldIgnoreTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.getAttribute("role") === "textbox"
  ) {
    return true;
  }

  // Radix dialogs, alert dialogs and popovers mark their content this way.
  return target.closest("[role='dialog'], [role='alertdialog']") !== null;
}

/**
 * Side-effect-only hook that registers global keyboard shortcuts
 * for clipboard operations (Cmd+C/X/V/D) and workflow execution (Cmd+Enter).
 */
export function useKeyboardShortcuts({
  disabled,
  selectedNodes,
  selectedEdges,
  hasClipboardData,
  copySelected,
  cutSelected,
  pasteFromClipboard,
  duplicateSelected,
  onAction,
  nodeCount,
}: UseKeyboardShortcutsProps): void {
  // The handler reads everything through this ref so the listener is bound
  // once, instead of being torn down and re-registered on every render.
  const latest = useRef({
    disabled,
    selectedNodes,
    selectedEdges,
    hasClipboardData,
    copySelected,
    cutSelected,
    pasteFromClipboard,
    duplicateSelected,
    onAction,
    nodeCount,
  });
  latest.current = {
    disabled,
    selectedNodes,
    selectedEdges,
    hasClipboardData,
    copySelected,
    cutSelected,
    pasteFromClipboard,
    duplicateSelected,
    onAction,
    nodeCount,
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreTarget(event.target)) return;

      const current = latest.current;

      const isMac = /mac/i.test(navigator.userAgent);
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
      if (!isCtrlOrCmd) return;

      // Cmd+Enter — run / cancel the workflow
      if (event.key === "Enter") {
        if (current.onAction && !current.disabled && current.nodeCount > 0) {
          event.preventDefault();
          current.onAction();
        }
        return;
      }

      if (current.disabled) return;

      const hasSelection =
        current.selectedNodes.length > 0 || current.selectedEdges.length > 0;

      switch (event.key.toLowerCase()) {
        case "c":
          if (hasSelection) {
            event.preventDefault();
            current.copySelected();
          }
          break;
        case "x":
          if (hasSelection) {
            event.preventDefault();
            current.cutSelected();
          }
          break;
        case "v":
          if (current.hasClipboardData) {
            event.preventDefault();
            current.pasteFromClipboard();
          }
          break;
        case "d":
          if (hasSelection) {
            event.preventDefault();
            current.duplicateSelected();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
