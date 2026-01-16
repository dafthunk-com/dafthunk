import type { NodeType } from "@dafthunk/types";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NodeTags } from "@/components/workflow/node-tags";
import { SubscriptionBadge } from "@/components/workflow/subscription-badge";

import { NodeDocsDialog } from "./node-docs-dialog";

interface NodeCardProps {
  nodeType: NodeType;
  variant?: "card" | "list";
  searchQuery?: string;
  highlightMatch?: (text: string, searchTerm: string) => React.ReactNode;
}

export function NodeCard({
  nodeType,
  variant = "card",
  searchQuery = "",
  highlightMatch,
}: NodeCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (variant === "list") {
    return (
      <>
        <Card
          className="cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50"
          onClick={() => setIsDialogOpen(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Name and Category */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <DynamicIcon
                  name={nodeType.icon as any}
                  className="h-4 w-4 text-blue-500 shrink-0"
                />
                <CardTitle className="text-base font-semibold leading-tight truncate">
                  {highlightMatch
                    ? highlightMatch(nodeType.name, searchQuery)
                    : nodeType.name}
                </CardTitle>
                {nodeType.subscription && (
                  <SubscriptionBadge variant="muted" size="lg" />
                )}
                {nodeType.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="shrink-0 text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Description */}
              {nodeType.description && (
                <div className="hidden md:block flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground leading-relaxed truncate">
                    {highlightMatch
                      ? highlightMatch(nodeType.description, searchQuery)
                      : nodeType.description}
                  </p>
                </div>
              )}

              {/* Stats */}
              {nodeType.compatibility && nodeType.compatibility.length > 0 && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="font-medium">Types:</span>
                    <span>{nodeType.compatibility.length}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <NodeDocsDialog
          nodeType={nodeType}
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      </>
    );
  }

  // Card view (default)
  return (
    <>
      <Card
        className="h-full cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50"
        onClick={() => setIsDialogOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <DynamicIcon
                name={nodeType.icon as any}
                className="h-4 w-4 text-blue-500 shrink-0"
              />
              <CardTitle className="text-base font-semibold leading-tight truncate">
                {highlightMatch
                  ? highlightMatch(nodeType.name, searchQuery)
                  : nodeType.name}
              </CardTitle>
              {nodeType.subscription && (
                <SubscriptionBadge variant="muted" size="lg" />
              )}
            </div>
            <NodeTags
              tags={nodeType.tags}
              functionCalling={nodeType.functionCalling}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {nodeType.description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-h-16 overflow-hidden">
              {highlightMatch
                ? highlightMatch(nodeType.description, searchQuery)
                : nodeType.description}
            </p>
          )}
          {nodeType.compatibility && nodeType.compatibility.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="font-medium">Types:</span>{" "}
                <span>{nodeType.compatibility.join(", ")}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <NodeDocsDialog
        nodeType={nodeType}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
