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
}: WorkflowOutputRendererProps) {
  return (
    <div className="space-y-1.5">
      {/* Output Value */}
      <WorkflowValueRenderer
        parameter={output}
        createObjectUrl={createObjectUrl}
        readonly={true}
      />
    </div>
  );
}
