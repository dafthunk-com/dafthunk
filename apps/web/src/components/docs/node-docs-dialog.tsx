import type { NodeType } from "@dafthunk/types";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { NodeTags } from "@/components/workflow/node-tags";

interface NodeDocsDialogProps {
  nodeType: NodeType;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NodeDocsDialog({
  nodeType,
  isOpen,
  onOpenChange,
}: NodeDocsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-start gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <DynamicIcon
                name={nodeType.icon as any}
                className="size-4 text-blue-500"
              />
              <span className="truncate">{nodeType.name}</span>
              <NodeTags
                tags={nodeType.tags}
                functionCalling={nodeType.functionCalling}
              />
            </div>
          </DialogTitle>
          {nodeType.description && (
            <DialogDescription className="text-base pb-2">
              {nodeType.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 -mx-1">
          <div className="space-y-4 py-4">
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

            {(!!nodeType.inputs?.length || !!nodeType.outputs?.length) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Parameters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nodeType.inputs && nodeType.inputs.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Inputs ({nodeType.inputs.length})
                        </h5>
                        <div className="space-y-2">
                          {nodeType.inputs.map((input, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 px-2.5 py-1.5 rounded border bg-blue-50/30 dark:bg-blue-950/10"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">
                                    {input.name}
                                    {input.required ? (
                                      <span
                                        className="text-red-500 ml-1"
                                        title="Required"
                                      >
                                        *
                                      </span>
                                    ) : (
                                      <span
                                        className="text-xs text-muted-foreground ml-1"
                                        title="Optional"
                                      >
                                        (optional)
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                                    {input.type}
                                  </span>
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

                    {nodeType.outputs && nodeType.outputs.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Outputs ({nodeType.outputs.length})
                        </h5>
                        <div className="space-y-2">
                          {nodeType.outputs.map((output, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 px-2.5 py-1.5 rounded border bg-green-50/30 dark:bg-green-950/10"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">
                                    {output.name}
                                  </span>
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                                    {output.type}
                                  </span>
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
