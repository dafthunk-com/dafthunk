import type { WorkflowParameter } from "@/components/workflow/workflow-types";

export interface InputWidgetProps {
  input: WorkflowParameter;
  value: any;
  onChange: (value: any) => void;
  onClear: () => void;
  disabled?: boolean;
  showClearButton?: boolean;
  className?: string;
  active?: boolean;
}

export interface FileInputWidgetProps extends InputWidgetProps {
  isUploading?: boolean;
  uploadError?: string | null;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  createObjectUrl?: (objectReference: any) => string;
}
