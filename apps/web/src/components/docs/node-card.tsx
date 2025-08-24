import type { NodeType } from "@dafthunk/types";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { NodeTags } from "@/components/workflow/node-tags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getTagColor } from "@/utils/tag-colors";

interface NodeCardProps {
  nodeType: NodeType;
  variant?: "card" | "list";
}

interface NodeDetailsDialogProps {
  nodeType: NodeType;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function NodeDetailsDialog({
  nodeType,
  isOpen,
  onOpenChange,
}: NodeDetailsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {nodeType.name}
                <NodeTags
                  tags={nodeType.tags}
                  functionCalling={nodeType.functionCalling}
                />
              </div>
            </div>
          </DialogTitle>
          {nodeType.description && (
            <DialogDescription className="text-base">
              {nodeType.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 -mx-1">
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Basic Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">
                    Type ID:
                  </span>
                  <p className="font-mono text-xs bg-muted px-2 py-1 rounded mt-1">
                    {nodeType.type}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Unique ID:
                  </span>
                  <p className="font-mono text-xs bg-muted px-2 py-1 rounded mt-1">
                    {nodeType.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Compatibility */}
            {nodeType.compatibility && nodeType.compatibility.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">
                    Workflow Compatibility
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {nodeType.compatibility.map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Parameters List */}
            {((nodeType.inputs && nodeType.inputs.length > 0) ||
              (nodeType.outputs && nodeType.outputs.length > 0)) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Parameters</h4>

                  {/* Inputs */}
                  {nodeType.inputs && nodeType.inputs.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Inputs ({nodeType.inputs.length})
                      </h5>
                      <div className="space-y-2">
                        {nodeType.inputs.map((input, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-2 rounded border bg-blue-50/30 dark:bg-blue-950/10"
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">
                                  {input.name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {input.type}
                                </Badge>
                                {input.required && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Required
                                  </Badge>
                                )}
                              </div>
                              {input.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {input.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Outputs */}
                  {nodeType.outputs && nodeType.outputs.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Outputs ({nodeType.outputs.length})
                      </h5>
                      <div className="space-y-2">
                        {nodeType.outputs.map((output, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-2 rounded border bg-green-50/30 dark:bg-green-950/10"
                          >
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">
                                  {output.name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {output.type}
                                </Badge>
                              </div>
                              {output.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {output.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NodeCard({ nodeType, variant = "card" }: NodeCardProps) {
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
                  {nodeType.name}
                </CardTitle>
                {nodeType.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className={`${getTagColor([tag])} shrink-0 text-xs`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Description */}
              {nodeType.description && (
                <div className="hidden md:block flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground leading-relaxed truncate">
                    {nodeType.description}
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

        <NodeDetailsDialog
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
                {nodeType.name}
              </CardTitle>
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
              {nodeType.description}
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

      <NodeDetailsDialog
        nodeType={nodeType}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
