import type { ObjectReference } from "@dafthunk/types";

import type { WorkflowParameter } from "@/components/workflow/workflow-types";

export interface FieldWidgetProps {
  input: WorkflowParameter;
  value: unknown;
  onChange: (value: unknown) => void;
  onClear: () => void;
  disabled?: boolean;
  showClearButton?: boolean;
  className?: string;
  active?: boolean;
  connected?: boolean; // true when field is connected to another node's output
}

export interface FileFieldWidgetProps extends FieldWidgetProps {
  isUploading?: boolean;
  uploadError?: string | null;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

// Re-export ObjectReference for convenience
export type { ObjectReference };
