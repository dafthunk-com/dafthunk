import type { ParameterValue } from "@dafthunk/types";
import { useCallback, useEffect, useRef } from "react";

import type { WorkflowParameter } from "../workflow-types";

/**
 * Base props that all widgets receive
 */
export interface BaseWidgetProps {
  onChange: (value: ParameterValue) => void;
  readonly?: boolean;
  className?: string;
}

/**
 * Widget descriptor - what each widget exports
 */
export interface WidgetDescriptor {
  /** The React component to render */
  component: React.ComponentType<any>;

  /** Node types this widget handles */
  nodeTypes: string[];

  /** Which input field this widget updates */
  inputField: string;

  /** Extract widget config from node inputs and outputs */
  extractConfig: (
    nodeId: string,
    inputs: WorkflowParameter[],
    outputs?: WorkflowParameter[]
  ) => any;
}

/**
 * Helper to create a widget descriptor with type safety
 */
export function createWidget(descriptor: WidgetDescriptor): WidgetDescriptor {
  return descriptor;
}

/**
 * Helper to find input value by ID
 */
export function getInputValue<T = ParameterValue>(
  inputs: WorkflowParameter[],
  id: string,
  defaultValue?: T
): T | undefined {
  const input = inputs.find((i) => i.id === id);
  return input?.value !== undefined ? (input.value as T) : defaultValue;
}

/**
 * Hook to debounce onChange calls to prevent excessive re-renders.
 * Updates immediately in the UI but debounces the actual node data update.
 */
export function useDebouncedChange(
  onChange: (value: ParameterValue) => void,
  delay = 300
) {
  const timeoutRef = useRef<number | null>(null);
  const previousValueRef = useRef<ParameterValue>(undefined);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedOnChange = useCallback(
    (value: ParameterValue) => {
      // Clear any pending timeout
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      // Schedule the update
      timeoutRef.current = window.setTimeout(() => {
        // Only call onChange if the value actually changed
        if (value !== previousValueRef.current) {
          previousValueRef.current = value;
          onChange(value);
        }
        timeoutRef.current = null;
      }, delay);
    },
    [onChange, delay]
  );

  // Return both debounced and immediate versions
  return {
    debouncedOnChange,
    immediateOnChange: onChange,
  };
}
