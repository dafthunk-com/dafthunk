import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { useEffect } from "react";

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
  onAction?: (e: React.MouseEvent) => void;
  nodeCount: number;
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
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true";

      if (isInputField) return;

      const isMac = /mac/i.test(navigator.userAgent);
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      if (!isCtrlOrCmd) return;

      // Cmd+Enter — execute workflow
      if (event.key === "Enter") {
        event.preventDefault();
        if (onAction && !disabled && nodeCount > 0) {
          const syntheticEvent = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
          }) as unknown as React.MouseEvent;
          onAction(syntheticEvent);
        }
        return;
      }

      const hasSelection = selectedNodes.length > 0 || selectedEdges.length > 0;

      switch (event.key.toLowerCase()) {
        case "c":
          if (!disabled && hasSelection) {
            event.preventDefault();
            copySelected();
          }
          break;
        case "x":
          if (!disabled && hasSelection) {
            event.preventDefault();
            cutSelected();
          }
          break;
        case "v":
          if (!disabled && hasClipboardData) {
            event.preventDefault();
            pasteFromClipboard();
          }
          break;
        case "d":
          if (!disabled && hasSelection) {
            event.preventDefault();
            duplicateSelected();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
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
  ]);
}
