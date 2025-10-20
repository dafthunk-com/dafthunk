import type { WorkflowParameter } from "../workflow-types";

/**
 * Base props that all widgets receive
 */
export interface BaseWidgetProps {
  onChange: (value: any) => void;
  readonly?: boolean;
  compact?: boolean;
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

  /** Extract widget config from node inputs */
  extractConfig: (nodeId: string, inputs: WorkflowParameter[]) => any;
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
export function getInputValue<T = any>(
  inputs: WorkflowParameter[],
  id: string,
  defaultValue?: T
): T | undefined {
  const input = inputs.find((i) => i.id === id);
  return input?.value !== undefined ? (input.value as T) : defaultValue;
}
