import React, { useEffect, useState } from "react";

import {
  clearNodeInput,
  convertValueByType,
  updateNodeInput,
  useWorkflow,
} from "@/components/workflow/workflow-context";
import { InputWidget } from "@/components/workflow/inputs";
import type { WorkflowParameter } from "@/components/workflow/workflow-types";
import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

interface WorkflowNodeInputProps {
  nodeId: string;
  nodeInputs: WorkflowParameter[];
  input: WorkflowParameter;
  readonly?: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  autoFocus?: boolean;
  onBlur?: () => void;
}

export function WorkflowNodeInput({
  nodeId,
  nodeInputs,
  input,
  readonly,
  containerRef,
  autoFocus = false,
  onBlur,
}: WorkflowNodeInputProps) {
  const { updateNodeData, edges, deleteEdge } = useWorkflow();
  const { createObjectUrl } = useObjectService();
  const [localValue, setLocalValue] = useState<any>(undefined);
  const [isExpanded, setIsExpanded] = useState(false);
  const debounceTimeoutRef = React.useRef<number | null>(null);

  useEffect(() => {
    setLocalValue(input?.value);
  }, [input]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== null) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Auto-focus the input when requested
  useEffect(() => {
    if (autoFocus && containerRef?.current && !readonly) {
      // Find the first focusable element (input, textarea, select, etc.)
      const focusable = containerRef.current.querySelector<HTMLElement>(
        'input, textarea, select, [contenteditable="true"]'
      );
      if (focusable) {
        // Small delay to ensure the element is fully rendered
        setTimeout(() => focusable.focus(), 0);
      }
    }
  }, [autoFocus, containerRef, readonly]);

  const handleInputChange = (value: any) => {
    if (!input || readonly || !updateNodeData) return;

    if (typeof value === "string") {
      setLocalValue(value);

      if (debounceTimeoutRef.current !== null) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = window.setTimeout(() => {
        const typedValue = convertValueByType(value, input.type);
        updateNodeInput(
          nodeId,
          input.id,
          typedValue,
          nodeInputs,
          updateNodeData,
          edges,
          deleteEdge
        );
        debounceTimeoutRef.current = null;
      }, 300);
    } else {
      setLocalValue(value);
      updateNodeInput(
        nodeId,
        input.id,
        value,
        nodeInputs,
        updateNodeData,
        edges,
        deleteEdge
      );
    }
  };

  const handleClearValue = () => {
    if (!input || readonly || !updateNodeData) return;

    setLocalValue(undefined);
    clearNodeInput(nodeId, input.id, nodeInputs, updateNodeData);
  };

  const hasValue = input.value !== undefined || localValue !== undefined;

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Check if focus is moving outside the container
    if (!containerRef?.current?.contains(e.relatedTarget as Node)) {
      onBlur?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      onBlur?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute right-full mr-3 rounded transition-all duration-200 ease-in-out overflow-hidden"
      )}
      onMouseEnter={() => !readonly && setIsExpanded(true)}
      onMouseLeave={() => !readonly && setIsExpanded(false)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <div className="w-[200px] h-full">
        <InputWidget
          input={input}
          value={localValue}
          onChange={handleInputChange}
          onClear={handleClearValue}
          readonly={readonly}
          createObjectUrl={createObjectUrl}
        />
      </div>
    </div>
  );
}
