import { useViewport } from "@xyflow/react";
import React, { useEffect, useState } from "react";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { FieldWidget } from "@/components/workflow/fields";
import {
  clearNodeInput,
  convertValueByType,
  updateNodeInput,
  useWorkflow,
} from "@/components/workflow/workflow-context";
import type { WorkflowParameter } from "@/components/workflow/workflow-types";
import { useObjectService } from "@/services/object-service";

interface InputEditPopoverProps {
  nodeId: string;
  nodeInputs: WorkflowParameter[];
  input: WorkflowParameter | null;
  isOpen: boolean;
  onClose: () => void;
  disabled?: boolean;
  anchorElement?: HTMLElement | null;
}

export function InputEditPopover({
  nodeId,
  nodeInputs,
  input,
  isOpen,
  onClose,
  disabled,
  anchorElement,
}: InputEditPopoverProps) {
  const { updateNodeData, edges, deleteEdge } = useWorkflow();
  const { createObjectUrl } = useObjectService();
  const { zoom } = useViewport();

  // Local state for immediate UI updates
  const [localValue, setLocalValue] = useState<any>(undefined);

  // Debounce ref for text inputs
  const debounceTimeoutRef = React.useRef<number | null>(null);

  // Sync local value with input value when input changes
  useEffect(() => {
    setLocalValue(input?.value);
  }, [input]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== null) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (value: any) => {
    if (!input || disabled || !updateNodeData) return;

    // For string values, update local state immediately and debounce the node update
    if (typeof value === "string") {
      // Update local state immediately for responsive UI
      setLocalValue(value);

      // Clear any pending debounce
      if (debounceTimeoutRef.current !== null) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Debounce the actual node data update
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
      // For non-string values (like file uploads), update immediately
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
    if (!input || disabled || !updateNodeData) return;

    setLocalValue(undefined);
    clearNodeInput(nodeId, input.id, nodeInputs, updateNodeData);
  };

  if (!input) {
    return null;
  }

  const scale = zoom;

  return (
    <Popover open={isOpen} modal={false}>
      {anchorElement && (
        <PopoverAnchor virtualRef={{ current: anchorElement }} />
      )}
      <PopoverContent
        side="left"
        align="center"
        className="w-80 rounded-xl p-0 border-0 shadow-lg nodrag nowheel"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "right center",
        }}
        onEscapeKeyDown={onClose}
        onInteractOutside={onClose}
      >
        <div>
          <FieldWidget
            input={input}
            value={localValue}
            onChange={handleInputChange}
            onClear={handleClearValue}
            disabled={disabled}
            createObjectUrl={createObjectUrl}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
