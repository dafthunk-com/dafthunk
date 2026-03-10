import type { NodeType } from "@dafthunk/types";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NodeTags } from "@/components/workflow/node-tags";
import { SubscriptionBadge } from "@/components/workflow/subscription-badge";
import { cn } from "@/utils/utils";

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
                  className={cn(
                    "h-4 w-4 shrink-0",
                    nodeType.trigger ? "text-emerald-500" : "text-blue-500"
                  )}
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
                className={cn(
                  "h-4 w-4 shrink-0",
                  nodeType.trigger ? "text-emerald-500" : "text-blue-500"
                )}
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
