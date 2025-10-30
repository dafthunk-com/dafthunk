import { memo, useMemo } from "react";

import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import {
  createDemoObjectUrl,
  demoEdges,
  demoExecution,
  demoNodes,
} from "@/data/homepage-demo";

export const DemoExecution = memo(() => {
  // Pre-populate outputs from execution data since readonly mode skips dynamic updates
  const processedNodes = useMemo(() => {
    const execMap = new Map(
      demoExecution.nodeExecutions.map((n) => [n.nodeId, n])
    );
    return demoNodes.map((node) => {
      const nodeExec = execMap.get(node.id);
      if (!nodeExec) return node;

      const updatedOutputs = node.data.outputs.map((output) => ({
        ...output,
        value: nodeExec.outputs?.[output.id] || nodeExec.outputs?.[output.name],
      }));

      return {
        ...node,
        data: {
          ...node.data,
          outputs: updatedOutputs,
          executionState: nodeExec.status || "completed",
          error: nodeExec.error,
        },
      };
    });
  }, []);

  return (
    <div className="h-full w-full">
      <WorkflowBuilder
        workflowId="homepage-demo"
        disabled={true}
        initialNodes={processedNodes}
        initialEdges={demoEdges}
        initialWorkflowExecution={demoExecution}
        createObjectUrl={createDemoObjectUrl}
        nodeTemplates={[]}
        expandedOutputs={true}
      />
    </div>
  );
});

DemoExecution.displayName = "DemoExecution";
