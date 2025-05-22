import type {
  Node as BackendNode,
  Parameter as BackendParameter,
} from "@dafthunk/types";
import type { Node } from "@xyflow/react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { DialogFormParameter } from "@/components/workflow/execution-form-dialog";
import type {
  InputOutputType,
  NodeTemplate,
  WorkflowNodeType,
  WorkflowParameter,
} from "@/components/workflow/workflow-types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Helper function to extract and format parameters for the execution dialog
export function extractDialogParametersFromNodes(
  nodes: Node<WorkflowNodeType>[],
  nodeTemplates: NodeTemplate[]
): DialogFormParameter[] {
  return nodes
    .filter(
      (node) =>
        node.data.nodeType?.startsWith("body-") ||
        node.data.nodeType?.startsWith("form-data-")
    )
    .map((node) => {
      const requiredInput = node.data.inputs.find((i) => i.id === "required");
      const isRequired = (requiredInput?.value as boolean) ?? true;

      // Special handling for JSON body node which doesn't use name
      if (node.data.nodeType === "body-json") {
        const nodeInstanceName = node.data.name || "JSON Body";

        return {
          nodeId: node.id,
          nameForForm: "requestBody", // Standard name for the JSON body
          label: nodeInstanceName, // Use the node name as label
          nodeName: node.data.name || "JSON Body",
          isRequired: isRequired,
          type: "body-json",
        } as DialogFormParameter;
      }

      // Original logic for other parameter types
      const nameInput = node.data.inputs.find((i) => i.id === "name");

      const fieldName = nameInput?.value as string;
      if (!fieldName) {
        console.warn(
          `Node ${node.id} (${node.data.name}) is a parameter type but missing 'name' value. Skipping for form.`
        );
        return null;
      }

      const nodeInstanceName = node.data.name; // The name of this specific node instance in the workflow
      const fieldKey = fieldName; // The actual key, e.g., 'customer_email'

      // Prioritize the user-given node instance name, if it's specific and not the default node type name.
      // Otherwise, use the fieldKey (name).
      const defaultNodeTypeDisplayName =
        nodeTemplates.find((t) => t.id === node.data.nodeType)?.name ||
        node.data.nodeType ||
        "";
      const isNodeNameSpecific =
        nodeInstanceName &&
        nodeInstanceName.trim() !== "" &&
        nodeInstanceName.toLowerCase() !==
          defaultNodeTypeDisplayName.toLowerCase();

      const labelText = isNodeNameSpecific ? nodeInstanceName : fieldKey; // Use fieldKey directly instead of friendlyKeyLabel

      return {
        nodeId: node.id,
        nameForForm: fieldName,
        label: labelText, // This is used for the Label and placeholder derivation
        nodeName: node.data.name || "Parameter Node", // This is for the contextual hint
        isRequired: isRequired,
        type: node.data.nodeType || "unknown.parameter",
      } as DialogFormParameter;
    })
    .filter((p): p is DialogFormParameter => p !== null); // Type guard for filtering nulls
}

// Helper function to convert backend nodes to ReactFlow nodes
export function adaptDeploymentNodesToReactFlowNodes(
  backendNodes: BackendNode[]
): Node<WorkflowNodeType>[] {
  return (backendNodes || []).map((depNode) => {
    const adaptedInputs: WorkflowParameter[] = (depNode.inputs || []).map(
      (param: BackendParameter) => {
        return {
          id: param.name,
          name: param.name,
          type: param.type as InputOutputType,
          value: param.value,
          required: param.required,
          description: param.description,
          hidden: param.hidden,
        };
      }
    );

    const adaptedOutputs: WorkflowParameter[] = (depNode.outputs || []).map(
      (param: BackendParameter) => {
        return {
          id: param.name,
          name: param.name,
          type: param.type as InputOutputType,
          value: param.value,
          required: param.required,
          description: param.description,
          hidden: param.hidden,
        };
      }
    );

    return {
      id: depNode.id,
      type: "workflowNode",
      position: depNode.position || { x: 0, y: 0 },
      data: {
        id: depNode.id,
        name: depNode.name,
        nodeType: depNode.type,
        inputs: adaptedInputs,
        outputs: adaptedOutputs,
        executionState: "idle",
      },
    } as Node<WorkflowNodeType>;
  });
}
