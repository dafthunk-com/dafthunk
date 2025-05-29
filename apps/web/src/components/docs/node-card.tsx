import type { NodeType } from "@dafthunk/types";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
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

interface NodeCardProps {
  nodeType: NodeType;
  variant?: "card" | "list";
}

export function NodeCard({ nodeType, variant = "card" }: NodeCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  if (variant === "list") {
    return (
      <>
        <Card
          className="cursor-pointer transition-all hover:border-primary/50"
          onClick={() => setIsDialogOpen(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Name and Category */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <CardTitle className="text-base font-semibold leading-tight truncate">
                  {nodeType.name}
                </CardTitle>
                <Badge
                  variant="secondary"
                  className={`${getCategoryColor(nodeType.category)} shrink-0 text-xs`}
                >
                  {nodeType.category}
                </Badge>
              </div>

              {/* Description */}
              <div className="hidden md:block flex-1 min-w-0">
                {nodeType.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed truncate">
                    {nodeType.description}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                {inputCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="font-medium">In:</span>
                    <span>{inputCount}</span>
                  </div>
                )}
                {outputCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium">Out:</span>
                    <span>{outputCount}</span>
                  </div>
                )}
                {nodeType.compatibility &&
                  nodeType.compatibility.length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span className="font-medium">Types:</span>
                      <span>{nodeType.compatibility.length}</span>
                    </div>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0">
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {nodeType.name}
                    <Badge
                      variant="secondary"
                      className={getCategoryColor(nodeType.category)}
                    >
                      {nodeType.category}
                    </Badge>
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
                {nodeType.compatibility &&
                  nodeType.compatibility.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold">
                          Workflow Compatibility
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {nodeType.compatibility.map((type) => (
                            <Badge
                              key={type}
                              variant="outline"
                              className="text-xs"
                            >
                              {type.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                {/* Inputs */}
                {nodeType.inputs && nodeType.inputs.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">
                        Inputs ({nodeType.inputs.length})
                      </h4>
                      <div className="space-y-3">
                        {nodeType.inputs.map((input, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-sm">
                                    {input.name}
                                  </h5>
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
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Outputs */}
                {nodeType.outputs && nodeType.outputs.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">
                        Outputs ({nodeType.outputs.length})
                      </h4>
                      <div className="space-y-3">
                        {nodeType.outputs.map((output, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-3 bg-green-50/50 dark:bg-green-950/20"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-sm">
                                    {output.name}
                                  </h5>
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
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Card view (default)
  return (
    <>
      <Card
        className="h-full cursor-pointer transition-all hover:border-primary/50"
        onClick={() => setIsDialogOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {nodeType.name}
                  <Badge
                    variant="secondary"
                    className={getCategoryColor(nodeType.category)}
                  >
                    {nodeType.category}
                  </Badge>
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

              {/* Inputs */}
              {nodeType.inputs && nodeType.inputs.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">
                      Inputs ({nodeType.inputs.length})
                    </h4>
                    <div className="space-y-3">
                      {nodeType.inputs.map((input, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-sm">
                                  {input.name}
                                </h5>
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
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Outputs */}
              {nodeType.outputs && nodeType.outputs.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">
                      Outputs ({nodeType.outputs.length})
                    </h4>
                    <div className="space-y-3">
                      {nodeType.outputs.map((output, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-3 bg-green-50/50 dark:bg-green-950/20"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-sm">
                                  {output.name}
                                </h5>
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
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
