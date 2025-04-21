import { useCallback, useState, useEffect } from "react";
import { useLoaderData, useParams, useNavigate } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { Workflow, Parameter, ParameterType } from "../../../api/src/lib/api/types";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { workflowService } from "@/services/workflowService";
import { Node, Edge, Connection } from "reactflow";
import { ReactFlowProvider } from "reactflow";
import {
  NodeTemplate,
  ExecutionEvent,
  WorkflowNodeData,
  WorkflowEdgeData,
} from "@/components/workflow/workflow-types";
import { fetchNodeTypes } from "@/services/workflowNodeService";
import { WorkflowError } from "@/components/workflow/workflow-error";
import { API_BASE_URL } from "@/config/api";

// Default empty workflow structure
const emptyWorkflow: Workflow = {
  id: "",
  name: "New Workflow",
  nodes: [],
  edges: [],
};

// Loader function for React Router
export async function editorLoader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) {
    return { workflow: emptyWorkflow };
  }

  try {
    const workflow = await workflowService.load(id);
    return { workflow: workflow };
  } catch (error) {
    throw new Error(
      `Failed to load workflow: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Debounce utility function
const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { workflow: initialWorkflow } = useLoaderData() as {
    workflow: Workflow;
  };
  const navigate = useNavigate();
  const [_, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeData>[]>([]);
  const [nodeTemplates, setNodeTemplates] = useState<NodeTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // Fetch node templates
  useEffect(() => {
    const loadNodeTemplates = async () => {
      try {
        const types = await fetchNodeTypes();
        // Convert NodeType to NodeTemplate
        const templates: NodeTemplate[] = types.map((type) => ({
          id: type.id,
          type: type.id,
          name: type.name,
          description: type.description || '',
          category: type.category,
          inputs: type.inputs.map((input) => ({
            id: input.name,
            type: input.type,
            name: input.name,
            hidden: input.hidden,
          })),
          outputs: type.outputs.map((output) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            hidden: output.hidden,
          })),
        }));
        setNodeTemplates(templates);
        setTemplatesError(null);
      } catch (_) {
        setTemplatesError(
          "Failed to load node templates. Please try again later."
        );
      }
    };

    loadNodeTemplates();
  }, []);

  // Convert the initial workflow to ReactFlow nodes and edges
  useEffect(() => {
    if (!initialWorkflow) {
      setIsLoading(false);
      setLoadError("Failed to load workflow data");
      return;
    }

    try {
      // Convert nodes
      const reactFlowNodes = initialWorkflow.nodes.map((node) => ({
        id: node.id,
        type: "workflowNode",
        position: node.position,
        data: {
          name: node.name,
          inputs: node.inputs.map((input) => ({
            id: input.name,
            type: input.type,
            name: input.name,
            value: input.value,
            hidden: input.hidden,
            required: input.required,
          })),
          outputs: node.outputs.map((output) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            hidden: output.hidden,
          })),
          executionState: "idle" as const,
          nodeType: node.type,
        },
      }));

      // Convert edges
      const reactFlowEdges = initialWorkflow.edges.map((edge, index) => ({
        id: `e${index}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceOutput,
        targetHandle: edge.targetInput,
        type: "workflowEdge",
        data: {
          isValid: true,
          sourceType: edge.sourceOutput,
          targetType: edge.targetInput,
        },
      }));

      // Set the state with the converted data
      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
      setLoadError(null);
    } catch (error) {
      console.error("Error processing workflow data:", error);
      setLoadError("Failed to process workflow data");
    } finally {
      setIsLoading(false);
    }
  }, [initialWorkflow]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(
      async (
        nodes: Node<WorkflowNodeData>[],
        edges: Edge<WorkflowEdgeData>[]
      ) => {
        if (!id) return;

        try {
          setIsSaving(true);

          // Convert ReactFlow nodes back to workflow nodes
          const workflowNodes = nodes.map((node) => {
            // Get all edges where this node is the target
            const incomingEdges = edges.filter(
              (edge) => edge.target === node.id
            );

            return {
              id: node.id,
              name: node.data.name,
              type: node.data.nodeType || "default",
              position: node.position,
              inputs: node.data.inputs.map((input) => {
                // Check if this input is connected to another node
                const isConnected = incomingEdges.some(
                  (edge) => edge.targetHandle === input.id
                );

                // Create a parameter with the correct type structure
                const parameter: Parameter = {
                  name: input.id,
                  type: input.type as ParameterType["type"],
                  description: input.name,
                  hidden: input.hidden,
                  required: input.required,
                };

                // Only add value if the input is not connected
                if (!isConnected && input.value !== undefined) {
                  (parameter as any).value = input.value;
                }

                return parameter;
              }),
              outputs: node.data.outputs.map((output) => {
                // Create a parameter with the correct type structure
                const parameter: Parameter = {
                  name: output.id,
                  type: output.type as ParameterType["type"],
                  description: output.name,
                  hidden: output.hidden,
                };

                return parameter;
              }),
            };
          });

          // Convert ReactFlow edges back to workflow edges
          const workflowEdges = edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            sourceOutput: edge.sourceHandle || "",
            targetInput: edge.targetHandle || "",
          }));

          // Create the workflow object
          const workflowToSave: Workflow = {
            ...initialWorkflow, // Keep other properties from the initial workflow
            id: id,
            name: initialWorkflow.name,
            nodes: workflowNodes,
            edges: workflowEdges,
          };

          // Verify we have nodes and edges before saving
          if (workflowNodes.length === 0 && initialWorkflow.nodes.length > 0) {
            return;
          }

          await workflowService.save(id, workflowToSave);
        } catch (_) {
          // Error handling without logging
        } finally {
          setIsSaving(false);
        }
      },
      1000
    ),
    [id, initialWorkflow]
  );

  // Handle node changes
  const handleNodesChange = useCallback(
    (updatedNodes: Node<WorkflowNodeData>[]) => {
      setNodes(updatedNodes);

      // Only save if we have nodes to save
      if (updatedNodes.length > 0) {
        debouncedSave(updatedNodes, edges);
      }
    },
    [edges, debouncedSave]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (updatedEdges: Edge<WorkflowEdgeData>[]) => {
      setEdges(updatedEdges);

      // Only trigger save if we have nodes
      if (nodes.length > 0) {
        debouncedSave(nodes, updatedEdges);
      }
    },
    [nodes, debouncedSave]
  );

  // Validate connections based on type compatibility
  const validateConnection = useCallback(
    (connection: Connection) => {
      // Find source and target nodes
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);

      if (!sourceNode || !targetNode) return false;

      // Find source and target parameters
      const sourceOutput = sourceNode.data.outputs.find(
        (output) => output.id === connection.sourceHandle
      );
      const targetInput = targetNode.data.inputs.find(
        (input) => input.id === connection.targetHandle
      );

      if (!sourceOutput || !targetInput) return false;

      // Check if types are compatible (allow 'any' to connect to anything)
      return (
        sourceOutput.type === targetInput.type ||
        sourceOutput.type === "any" ||
        targetInput.type === "any"
      );
    },
    [nodes]
  );

  // Simulate workflow execution
  const executeWorkflow = useCallback(
    (
      workflowId: string,
      callbacks: {
        onEvent: (event: ExecutionEvent) => void;
        onComplete: () => void;
        onError: (error: string) => void;
      }
    ) => {
      // Connect to the server-side SSE endpoint for workflow execution
      console.log(
        `Connecting to workflow execution endpoint for ID: ${workflowId}`
      );

      // Create EventSource for SSE connection
      const eventSource = new EventSource(
        `${API_BASE_URL}/workflows/${workflowId}/execute`,
        { withCredentials: true }
      );

      // Set up event listeners for different event types
      eventSource.addEventListener("node-start", (event) => {
        try {
          const data = JSON.parse(event.data);
          callbacks.onEvent({
            type: "node-start",
            nodeId: data.nodeId,
          });
        } catch (error) {
          console.error("Error parsing node-start event:", error);
        }
      });

      eventSource.addEventListener("node-complete", (event) => {
        try {
          const data = JSON.parse(event.data);
          callbacks.onEvent({
            type: "node-complete",
            nodeId: data.nodeId,
            outputs: data.data?.outputs || {},
          });
        } catch (error) {
          console.error("Error parsing node-complete event:", error);
        }
      });

      eventSource.addEventListener("node-error", (event) => {
        try {
          const data = JSON.parse(event.data);
          callbacks.onEvent({
            type: "node-error",
            nodeId: data.nodeId,
            error: data.error,
          });
        } catch (error) {
          console.error("Error parsing node-error event:", error);
        }
      });

      eventSource.addEventListener("execution-complete", () => {
        callbacks.onComplete();
        eventSource.close();
      });

      eventSource.addEventListener("execution-error", (event) => {
        try {
          const data = JSON.parse(event.data);
          callbacks.onError(data.error || "Unknown execution error");
        } catch (_) {
          callbacks.onError("Failed to parse execution error");
        } finally {
          eventSource.close();
        }
      });

      eventSource.addEventListener("validation-error", (event) => {
        try {
          const data = JSON.parse(event.data);
          callbacks.onError(data.error || "Workflow validation error");
        } catch (_) {
          callbacks.onError("Failed to parse validation error");
        } finally {
          eventSource.close();
        }
      });

      // Handle connection errors
      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        // Check if the error is due to a 403 response (AI nodes in free plan)
        if (eventSource.readyState === EventSource.CLOSED) {
          fetch(`${API_BASE_URL}/workflows/${workflowId}/execute`, {
            credentials: "include",
          })
            .then((response) => {
              if (response.status === 403) {
                return response.json();
              }
              throw new Error("Connection to execution service failed");
            })
            .then((data) => {
              callbacks.onError(
                data.error || "AI nodes are not available in the free plan"
              );
            })
            .catch(() => {
              callbacks.onError("Connection to execution service failed");
            })
            .finally(() => {
              eventSource.close();
            });
        } else {
          callbacks.onError("Connection to execution service failed");
          eventSource.close();
        }
      };

      // Return cleanup function to close the connection
      return () => {
        console.log("Closing SSE connection");
        eventSource.close();
      };
    },
    []
  );

  // Handle retry loading
  const handleRetryLoading = () => {
    if (id) {
      navigate(0); // Refresh the current page
    }
  };

  // Show error if loading failed
  if (loadError && !isLoading) {
    return <WorkflowError message={loadError} onRetry={handleRetryLoading} />;
  }

  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex flex-col relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading workflow...</p>
            </div>
          </div>
        ) : templatesError ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-500 mb-4">{templatesError}</p>
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="h-full w-full flex-grow">
            <WorkflowBuilder
              workflowId={id || ""}
              initialNodes={nodes}
              initialEdges={edges}
              nodeTemplates={nodeTemplates}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              validateConnection={validateConnection}
              executeWorkflow={executeWorkflow}
              onExecutionStart={() => {
                // Reset all nodes to idle state before execution
                setNodes((currentNodes) =>
                  currentNodes.map((node) => ({
                    ...node,
                    data: {
                      ...node.data,
                      executionState: "idle" as const,
                      // Reset output values
                      outputs: node.data.outputs.map((output) => ({
                        ...output,
                        value: undefined,
                      })),
                    },
                  }))
                );
              }}
              onExecutionComplete={() => {}}
              onExecutionError={() => {}}
              onNodeStart={() => {}}
              onNodeComplete={(nodeId, outputs) => {
                // Update the node's output parameter values with the values from the execution
                if (outputs) {
                  console.log(
                    `Node ${nodeId} completed with outputs:`,
                    outputs
                  );

                  // Use functional update to ensure we're working with the latest state
                  setNodes((currentNodes) => {
                    // Find the node to update
                    const nodeToUpdate = currentNodes.find(
                      (node) => node.id === nodeId
                    );
                    if (!nodeToUpdate) {
                      console.error(`Node ${nodeId} not found`);
                      return currentNodes;
                    }

                    // Map the output values to the node's output parameters
                    const updatedOutputs = nodeToUpdate.data.outputs.map(
                      (output) => {
                        // Check if this output parameter has a value in the execution outputs
                        if (outputs[output.id] !== undefined) {
                          console.log(
                            `Mapping output ${output.id} with value:`,
                            outputs[output.id]
                          );
                          return {
                            ...output,
                            value: outputs[output.id],
                          };
                        }
                        return output;
                      }
                    );

                    const updatedNodes = currentNodes.map((node) => {
                      // Check if the node is the one we want to update
                      if (node.id === nodeId) {
                        return {
                          ...node,
                          data: {
                            ...node.data,
                            outputs: updatedOutputs,
                          },
                        };
                      }
                      return node;
                    });

                    return updatedNodes;
                  });
                }
              }}
              onNodeError={() => {}}
            />
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}
