import { ObjectReference } from "@dafthunk/types";

import { WorkflowParameter } from "./workflow-types";
import { WorkflowValueRenderer } from "./workflow-value-renderer";

interface WorkflowOutputRendererProps {
  output: WorkflowParameter;
  createObjectUrl: (objectReference: ObjectReference) => string;
  compact?: boolean;
}

export function WorkflowOutputRenderer({
  output,
  createObjectUrl,
  compact = false,
}: WorkflowOutputRendererProps) {
  return (
    <WorkflowValueRenderer
      parameter={output}
      createObjectUrl={createObjectUrl}
      compact={compact}
      readonly={true}
    />
  );
}
