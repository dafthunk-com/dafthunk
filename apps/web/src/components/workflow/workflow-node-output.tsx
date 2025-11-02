import React, { useEffect } from "react";

import { Field } from "@/components/workflow/fields";
import type { WorkflowParameter } from "@/components/workflow/workflow-types";
import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

interface WorkflowNodeOutputProps {
  output: WorkflowParameter;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  autoFocus?: boolean;
  onBlur?: () => void;
  active?: boolean;
}

export function WorkflowNodeOutput({
  output,
  containerRef,
  autoFocus = false,
  onBlur,
  active,
}: WorkflowNodeOutputProps) {
  const { createObjectUrl } = useObjectService();

  // Auto-focus the output preview when requested
  useEffect(() => {
    if (autoFocus && containerRef?.current) {
      // Small delay to ensure the element is fully rendered
      setTimeout(() => containerRef.current?.focus(), 0);
    }
  }, [autoFocus, containerRef]);

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

  // Determine width based on output type
  const getOutputClassName = () => {
    switch (output.type) {
      case "string":
      case "json":
      case "image":
      case "document":
      case "audio":
      case "gltf":
      case "point":
      case "multipoint":
      case "linestring":
      case "multilinestring":
      case "polygon":
      case "multipolygon":
      case "geometry":
      case "geometrycollection":
      case "feature":
      case "featurecollection":
      case "geojson":
        return "w-48"; // 192px for text areas, file previews, and geojson
      case "number":
      case "secret":
        return "w-32"; // 128px for number and secret displays
      case "boolean":
        return "w-fit"; // Natural width for boolean display
      case "any":
        return "w-48"; // Larger for any type
      default:
        return "w-32"; // Default width
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute left-full ml-3 rounded transition-all duration-200 ease-in-out overflow-hidden"
      )}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="h-full">
        <Field
          parameter={output}
          value={output.value}
          onChange={() => {}} // Read-only, no changes allowed
          onClear={() => {}} // Read-only, no clearing allowed
          disabled={true}
          clearable={false}
          createObjectUrl={createObjectUrl}
          className={getOutputClassName()}
          active={active}
        />
      </div>
    </div>
  );
}
