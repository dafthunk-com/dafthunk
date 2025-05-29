import type { NodeType } from "@dafthunk/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NodeCardProps {
  nodeType: NodeType;
}

export function NodeCard({ nodeType }: NodeCardProps) {
  // Get category color based on category name
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      ai: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      text: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      image:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      audio:
        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      net: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      json: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      number:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
      parameter:
        "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      document: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
      email: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    };
    return (
      colors[category.toLowerCase()] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    );
  };

  const inputCount = nodeType.inputs?.length || 0;
  const outputCount = nodeType.outputs?.length || 0;

  return (
    <Card className="h-full cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {nodeType.icon && (
              <div className="text-lg shrink-0">{nodeType.icon}</div>
            )}
            <CardTitle className="text-base font-semibold leading-tight truncate">
              {nodeType.name}
            </CardTitle>
          </div>
          <Badge
            variant="secondary"
            className={`${getCategoryColor(nodeType.category)} shrink-0 text-xs`}
          >
            {nodeType.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {nodeType.description && (
          <p className="text-sm text-muted-foreground leading-relaxed max-h-16 overflow-hidden">
            {nodeType.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {inputCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="font-medium">Inputs:</span>{" "}
              <span>{inputCount}</span>
            </div>
          )}
          {outputCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-medium">Outputs:</span>{" "}
              <span>{outputCount}</span>
            </div>
          )}
          {nodeType.compatibility && nodeType.compatibility.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="font-medium">Types:</span>{" "}
              <span>{nodeType.compatibility.join(", ")}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
