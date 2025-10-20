import type { WorkflowParameter } from "../workflow-types";
import type { WidgetDescriptor } from "./widget";

/**
 * Widget instance - everything needed to render a widget
 */
export interface Widget {
  /** The React component to render */
  Component: React.ComponentType<any>;

  /** Configuration props for the component */
  config: any;

  /** Which input field this widget updates */
  inputField: string;
}

class WidgetRegistry {
  private widgets = new Map<string, WidgetDescriptor>();

  /**
   * Register a widget for one or more node types
   */
  register(descriptor: WidgetDescriptor): void {
    descriptor.nodeTypes.forEach((nodeType) => {
      this.widgets.set(nodeType, descriptor);
    });
  }

  /**
   * Get widget for a node type
   * Returns everything needed to render the widget
   */
  for(
    nodeType: string,
    nodeId: string,
    inputs: WorkflowParameter[]
  ): Widget | null {
    const descriptor = this.widgets.get(nodeType);
    if (!descriptor) return null;

    const config = descriptor.extractConfig(nodeId, inputs);
    if (!config) return null;

    return {
      Component: descriptor.component,
      config,
      inputField: descriptor.inputField,
    };
  }

  /**
   * Check if a node type has a widget
   */
  has(nodeType: string): boolean {
    return this.widgets.has(nodeType);
  }
}

// Global registry instance
export const registry = new WidgetRegistry();
