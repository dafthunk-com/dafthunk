import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Node } from "@xyflow/react";
import type {
  NodeTemplate,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types.tsx";
import type { DialogFormParameter } from "@/components/workflow/execution-form-dialog";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
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
        node.data.nodeType?.startsWith("parameter.") &&
        node.data.inputs?.some((inp) => inp.id === "formFieldName")
    )
    .map((node) => {
      const formFieldNameInput = node.data.inputs.find(
        (i) => i.id === "formFieldName"
      );
      const requiredInput = node.data.inputs.find(
        (i) => i.id === "required"
      );

      const nameForFormField = formFieldNameInput?.value as string;
      if (!nameForFormField) {
        console.warn(
          `Node ${node.id} (${node.data.name}) is a parameter type but missing 'formFieldName' value. Skipping for form.`
        );
        return null;
      }

      const nodeInstanceName = node.data.name; // The name of this specific node instance in the workflow
      const fieldKey = nameForFormField; // The actual key, e.g., "customer_email"

      // Prioritize the user-given node instance name, if it's specific and not the default node type name.
      // Otherwise, use the fieldKey (formFieldName).
      const defaultNodeTypeDisplayName =
        nodeTemplates.find((t) => t.id === node.data.nodeType)?.name ||
        node.data.nodeType ||
        "";
      const isNodeNameSpecific =
        nodeInstanceName &&
        nodeInstanceName.trim() !== "" &&
        nodeInstanceName.toLowerCase() !==
          defaultNodeTypeDisplayName.toLowerCase();

      const labelText = isNodeNameSpecific
        ? nodeInstanceName
        : fieldKey; // Use fieldKey directly instead of friendlyKeyLabel

      return {
        nodeId: node.id,
        nameForForm: nameForFormField,
        label: labelText, // This is used for the Label and placeholder derivation
        nodeName: node.data.name || "Parameter Node", // This is for the contextual hint
        isRequired: (requiredInput?.value as boolean) ?? true,
        type: node.data.nodeType || "unknown.parameter",
      } as DialogFormParameter;
    })
    .filter((p): p is DialogFormParameter => p !== null); // Type guard for filtering nulls
}
