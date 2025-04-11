import { NodeRegistry } from "./nodes/nodeRegistry";

export { ExecuteWorkflow } from "./workflows/execute";

export interface WorkflowExecutionOptions {
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, outputs: Record<string, any>) => void;
  onNodeError?: (nodeId: string, error: string) => void;
  onExecutionComplete?: () => void;
  onExecutionError?: (error: string) => void;
  abortSignal?: AbortSignal;
}

export type ExecutionState = "idle" | "executing" | "completed" | "error";

export interface ExecutionEvent {
  type: "node-start" | "node-complete" | "node-error";
  nodeId: string;
  timestamp: number;
  error?: string;
  outputs?: Record<string, any>;
}

export interface ExecutionResult {
  nodeId: string;
  success: boolean;
  error?: string;
  outputs?: Record<string, any>;
}

export interface Env {
  EXECUTE: Workflow;
  BUCKET: R2Bucket;
  AI: Ai;
}

// Define types for the instance status
interface WorkflowStepOutput {
  workflow: {
    id: string;
    [key: string]: any;
  };
  nodeOutputs: Record<string, any>;
  executedNodes: string[] | Record<string, any>;
  nodeErrors?: Record<string, string>;
  sortedNodes?: string[];
  [key: string]: any;
}

interface WorkflowOutput {
  workflowId: string;
  nodeOutputs: Record<string, Record<string, any>>;
  executedNodes: string[];
  errors: Record<string, string>;
}

interface InstanceStatus {
  status: "running" | "complete" | "errored";
  __LOCAL_DEV_STEP_OUTPUTS?: WorkflowStepOutput[];
  output: WorkflowOutput | null;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    let url = new URL(req.url);

    if (req.method === "GET") {
      let id = url.searchParams.get("instanceId");
      if (id && url.pathname === "/") {
        let instance = await env.EXECUTE.get(id);
        return Response.json(
          {
            status: await instance.status(),
          },
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      } else if (url.pathname === "/types") {
        return Response.json(NodeRegistry.getInstance().getNodeTypes(), {
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      return new Response("Not Found", { status: 404 });
    } else if (req.method === "POST") {
      if (url.pathname === "/") {
        const body = await req.json();
        let instance = await env.EXECUTE.create({
          params: body,
        });
        return Response.json({
          id: instance.id,
          details: await instance.status(),
        });
      } else if (url.pathname === "/stream") {
        const body = await req.json();
        let instance = await env.EXECUTE.create({
          params: body,
        });

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();

            while (true) {
              const status = await instance.status();
              const data = encoder.encode(
                `data: ${JSON.stringify(status)}\n\n`
              );
              controller.enqueue(data);

              if (status.status === "complete" || status.status === "errored") {
                controller.close();
                break;
              }

              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } else if (url.pathname === "/workflows/execute") {
        // New endpoint for backwards compatibility
        const body = await req.json();
        let instance = await env.EXECUTE.create({
          params: body,
        });

        // Track previously executed nodes to detect new completions
        const previouslyExecuted = new Set<string>();

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            let executionState: ExecutionState = "executing";

            while (true) {
              const status = (await instance.status()) as InstanceStatus;

              // Map status to new API format
              if (status.status === "running") {
                executionState = "executing";

                // Check if the output is available to detect node completions
                if (
                  status.__LOCAL_DEV_STEP_OUTPUTS &&
                  status.__LOCAL_DEV_STEP_OUTPUTS.length > 0
                ) {
                  const latestStep =
                    status.__LOCAL_DEV_STEP_OUTPUTS[
                      status.__LOCAL_DEV_STEP_OUTPUTS.length - 1
                    ];

                  // If we have sortedNodes, we can detect node starts and completions
                  if (latestStep.sortedNodes) {
                    // Check for newly executed nodes
                    if (latestStep.executedNodes) {
                      const currentlyExecuted = new Set<string>(
                        typeof latestStep.executedNodes === "object" &&
                        !Array.isArray(latestStep.executedNodes)
                          ? Object.keys(latestStep.executedNodes)
                          : Array.isArray(latestStep.executedNodes)
                            ? latestStep.executedNodes
                            : []
                      );

                      // Find new completions (nodes in currentlyExecuted but not in previouslyExecuted)
                      for (const nodeId of currentlyExecuted) {
                        if (!previouslyExecuted.has(nodeId)) {
                          const event: ExecutionEvent = {
                            type: "node-complete",
                            nodeId,
                            timestamp: Date.now(),
                            outputs: latestStep.nodeOutputs[nodeId],
                          };

                          controller.enqueue(
                            encoder.encode(
                              `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
                            )
                          );
                          previouslyExecuted.add(nodeId);
                        }
                      }

                      // Check for node errors
                      if (latestStep.nodeErrors) {
                        for (const [nodeId, error] of Object.entries(
                          latestStep.nodeErrors
                        )) {
                          if (!previouslyExecuted.has(nodeId)) {
                            const event: ExecutionEvent = {
                              type: "node-error",
                              nodeId,
                              timestamp: Date.now(),
                              error: String(error),
                            };

                            controller.enqueue(
                              encoder.encode(
                                `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
                              )
                            );
                            previouslyExecuted.add(nodeId);
                          }
                        }
                      }

                      // Check for nodes that are about to start (next in sequence)
                      const remainingNodes = latestStep.sortedNodes.filter(
                        (nodeId) =>
                          !currentlyExecuted.has(nodeId) &&
                          !Object.prototype.hasOwnProperty.call(
                            latestStep.nodeErrors || {},
                            nodeId
                          )
                      );

                      if (remainingNodes.length > 0) {
                        const nextNodeId = remainingNodes[0];
                        const event: ExecutionEvent = {
                          type: "node-start",
                          nodeId: nextNodeId,
                          timestamp: Date.now(),
                        };

                        controller.enqueue(
                          encoder.encode(
                            `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
                          )
                        );
                      }
                    }
                  }
                }
              } else if (status.status === "complete") {
                executionState = "completed";

                // Process final state
                if (status.output) {
                  // Send node completion events for any remaining nodes
                  if (status.output.executedNodes) {
                    for (const nodeId of status.output.executedNodes) {
                      if (!previouslyExecuted.has(nodeId)) {
                        const outputs = status.output.nodeOutputs[nodeId] || {};
                        const event: ExecutionEvent = {
                          type: "node-complete",
                          nodeId,
                          timestamp: Date.now(),
                          outputs,
                        };

                        controller.enqueue(
                          encoder.encode(
                            `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
                          )
                        );
                        previouslyExecuted.add(nodeId);
                      }
                    }
                  }

                  // Send error events for any nodes with errors
                  if (status.output.errors) {
                    for (const [nodeId, error] of Object.entries(
                      status.output.errors
                    )) {
                      if (
                        nodeId !== "workflow" &&
                        !previouslyExecuted.has(nodeId)
                      ) {
                        const event: ExecutionEvent = {
                          type: "node-error",
                          nodeId,
                          timestamp: Date.now(),
                          error: String(error),
                        };

                        controller.enqueue(
                          encoder.encode(
                            `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
                          )
                        );
                        previouslyExecuted.add(nodeId);
                      }
                    }
                  }
                }

                controller.enqueue(
                  encoder.encode(
                    `event: execution-complete\ndata: ${JSON.stringify({
                      timestamp: Date.now(),
                      type: "execution-complete",
                    })}\n\n`
                  )
                );
                controller.close();
                break;
              } else if (status.status === "errored") {
                executionState = "error";

                // Send workflow error event
                if (
                  status.output &&
                  status.output.errors &&
                  status.output.errors.workflow
                ) {
                  const event: ExecutionEvent = {
                    type: "node-error",
                    nodeId: "workflow",
                    timestamp: Date.now(),
                    error: String(status.output.errors.workflow),
                  };

                  controller.enqueue(
                    encoder.encode(
                      `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
                    )
                  );
                }

                controller.enqueue(
                  encoder.encode(
                    `event: execution-error\ndata: ${JSON.stringify({
                      timestamp: Date.now(),
                      type: "execution-error",
                    })}\n\n`
                  )
                );
                controller.close();
                break;
              }

              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      return new Response("Not Found", { status: 404 });
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};
