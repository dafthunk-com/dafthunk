import type { NodeType } from "@dafthunk/types";
import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NodesStatsProps {
  nodeTypes: NodeType[];
}

export function NodesStats({ nodeTypes }: NodesStatsProps) {
  const stats = useMemo(() => {
    const categories = new Set<string>();
    const workflowTypes = new Set<string>();
    let totalInputs = 0;
    let totalOutputs = 0;

    nodeTypes.forEach((nodeType) => {
      categories.add(nodeType.category);
      totalInputs += nodeType.inputs?.length || 0;
      totalOutputs += nodeType.outputs?.length || 0;

      if (nodeType.compatibility) {
        nodeType.compatibility.forEach((type) => workflowTypes.add(type));
      }
    });

    return {
      totalNodes: nodeTypes.length,
      totalCategories: categories.size,
      totalInputs,
      totalOutputs,
      supportedWorkflowTypes: Array.from(workflowTypes),
    };
  }, [nodeTypes]);

  if (nodeTypes.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 mt-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold">{stats.totalNodes}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">Categories</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold">{stats.totalCategories}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">Total Inputs</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold">{stats.totalInputs}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">Total Outputs</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold">{stats.totalOutputs}</div>
        </CardContent>
      </Card>
    </div>
  );
}
