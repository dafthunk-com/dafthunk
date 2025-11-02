import type { ObjectReference } from "@dafthunk/types";

import type { WorkflowParameter } from "@/components/workflow/workflow-types";

export interface FieldProps {
  parameter: WorkflowParameter;
  value: unknown;
  onChange: (value: unknown) => void;
  onClear: () => void;
  className?: string;
  disabled?: boolean;
  connected?: boolean;
  clearable?: boolean;
}

export interface FileFieldProps extends FieldProps {
  isUploading?: boolean;
  uploadError?: string | null;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

// Re-export ObjectReference for convenience
export type { ObjectReference };
