import { useCallback, useState, useEffect } from "react";
import { useLoaderData, useParams, useNavigate } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import {
  Workflow,
  Parameter,
  ParameterType,
  WorkflowExecution,
} from "@dafthunk/types";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { workflowService } from "@/services/workflowService";
import { Node, Edge, Connection } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  NodeTemplate,
  WorkflowNodeType,
  WorkflowEdgeType,
} from "@/components/workflow/workflow-types";
import { fetchNodeTypes } from "@/services/workflowNodeService";
import { WorkflowError } from "@/components/workflow/workflow-error";
import { API_BASE_URL } from "@/config/api";
import { debounce } from "@/utils/utils";

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

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { workflow: initialWorkflow } =
    (useLoaderData() as { workflow: Workflow } | undefined) ?? {};
  const navigate = useNavigate();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);
  const [nodeTemplates, setNodeTemplates] = useState<NodeTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [isProcessingWorkflow, setIsProcessingWorkflow] = useState(true);
  const [hasProcessedInitialWorkflow, setHasProcessedInitialWorkflow] =
    useState(false); // Track if initial workflow processing completed

  // Fetch node templates
  useEffect(() => {
    const loadNodeTemplates = async () => {
      try {
        const types = await fetchNodeTypes();
        const templates: NodeTemplate[] = types.map((type) => ({
          id: type.id,
          type: type.id,
          name: type.name,
          description: type.description || "",
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

  // Convert the initial workflow (only if it exists)
  useEffect(() => {
    // Only set 'not found' error if we haven't processed a valid workflow yet.
    // This prevents the error flash during exit transitions.
    if (!initialWorkflow && !hasProcessedInitialWorkflow) {
      setIsProcessingWorkflow(false);
      setLoadError("Workflow data not found or invalid.");
      return;
    }

    // If initialWorkflow becomes undefined *after* initial processing, just bail out.
    if (!initialWorkflow) {
      setIsProcessingWorkflow(false); // Ensure loading state is cleared
      return;
    }

    setIsProcessingWorkflow(true);
    try {
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

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
      setLoadError(null);
      setHasProcessedInitialWorkflow(true); // Mark initial processing as complete
    } catch (error) {
      console.error("Error processing workflow data:", error);
      setLoadError("Failed to process workflow data");
    } finally {
      setIsProcessingWorkflow(false);
    }
  }, [initialWorkflow, hasProcessedInitialWorkflow]); // Add hasProcessedInitialWorkflow to dependency array

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(
      async (
        currentNodes: Node<WorkflowNodeType>[],
        currentEdges: Edge<WorkflowEdgeType>[]
      ) => {
        if (!id || !initialWorkflow) return;

        try {
          if (
            currentNodes.some(
              (node) => node.data.executionState === "executing"
            )
          ) {
            console.log(
              "Workflow is executing, but still saving legitimate changes"
            );
          }

          const workflowNodes = currentNodes.map((node) => {
            const incomingEdges = currentEdges.filter(
              (edge) => edge.target === node.id
            );
            return {
              id: node.id,
              name: node.data.name,
              type: node.data.nodeType || "default",
              position: node.position,
              inputs: node.data.inputs.map((input) => {
                const isConnected = incomingEdges.some(
                  (edge) => edge.targetHandle === input.id
                );
                const parameter: Parameter = {
                  name: input.id,
                  type: input.type as ParameterType["type"],
                  description: input.name,
                  hidden: input.hidden,
                  required: input.required,
                };
                if (!isConnected && input.value !== undefined) {
                  (parameter as any).value = input.value;
                }
                return parameter;
              }),
              outputs: node.data.outputs.map((output) => {
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

          const workflowEdges = currentEdges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            sourceOutput: edge.sourceHandle || "",
            targetInput: edge.targetHandle || "",
          }));

          const workflowToSave: Workflow = {
            ...initialWorkflow,
            id: id,
            name: initialWorkflow.name,
            nodes: workflowNodes,
            edges: workflowEdges,
          };

          if (workflowNodes.length === 0 && initialWorkflow.nodes.length > 0) {
            console.warn(
              "Attempted to save an empty node list, aborting save."
            );
            return;
          }

          console.log("Saving workflow:", id);
          await workflowService.save(id, workflowToSave);
        } catch (error) {
          console.error("Error saving workflow:", error);
        }
      },
      1000
    ),
    [id, initialWorkflow]
  );

  // Handle node changes
  const handleNodesChange = useCallback(
    (updatedNodes: Node<WorkflowNodeType>[]) => {
      setNodes(updatedNodes);
      if (updatedNodes.length > 0) {
        debouncedSave(updatedNodes, edges);
      }
    },
    [edges, debouncedSave]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (updatedEdges: Edge<WorkflowEdgeType>[]) => {
      setEdges(updatedEdges);
      if (nodes.length > 0) {
        debouncedSave(nodes, updatedEdges);
      }
    },
    [nodes, debouncedSave]
  );

  // Validate connections based on type compatibility
  const validateConnection = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);
      if (!sourceNode || !targetNode) return false;
      const sourceOutput = sourceNode.data.outputs.find(
        (output) => output.id === connection.sourceHandle
      );
      const targetInput = targetNode.data.inputs.find(
        (input) => input.id === connection.targetHandle
      );
      if (!sourceOutput || !targetInput) return false;
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
      onExecution: (execution: WorkflowExecution) => void
    ) => {
      console.log(`Starting workflow execution for ID: ${workflowId}`);
      fetch(
        `${API_BASE_URL}/workflows/${workflowId}/execute?monitorProgress=true`,
        {
          method: "GET",
          credentials: "include",
        }
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to start workflow execution");
          }
          return response.json();
        })
        .then(async (initialExecution: WorkflowExecution) => {
          const executionId = initialExecution.id;
          try {
            const statusResponse = await fetch(
              `${API_BASE_URL}/executions/${executionId}`,
              {
                credentials: "include",
              }
            );
            if (statusResponse.ok) {
              const loadedExecution =
                (await statusResponse.json()) as WorkflowExecution;
              onExecution(loadedExecution);
            } else {
              onExecution(initialExecution);
            }
          } catch {
            onExecution(initialExecution);
          }
          const pollInterval = setInterval(async () => {
            try {
              const statusResponse = await fetch(
                `${API_BASE_URL}/executions/${executionId}`,
                {
                  credentials: "include",
                }
              );
              if (statusResponse.status === 404) {
                return;
              }
              if (!statusResponse.ok) {
                throw new Error("Failed to fetch execution status");
              }
              const execution =
                (await statusResponse.json()) as WorkflowExecution;
              onExecution(execution);
              if (
                execution.status === "completed" ||
                execution.status === "error"
              ) {
                clearInterval(pollInterval);
              }
            } catch (error) {
              console.error("Error polling execution status:", error);
              clearInterval(pollInterval);
            }
          }, 1000);
          // Return a cleanup function that requests cancellation but lets polling continue
          return () => {
            console.log(
              `Requesting cancellation for execution ID: ${executionId}`
            );
            // Assume a DELETE endpoint exists for cancellation
            fetch(`${API_BASE_URL}/executions/${executionId}`, {
              method: "DELETE",
              credentials: "include",
            })
              .then((response) => {
                if (!response.ok) {
                  console.error(
                    `Failed to request cancellation for execution ${executionId}. Status: ${response.status}`
                  );
                  // Optionally handle cancellation request failure - maybe stop polling here?
                  // For now, let polling continue as the backend might still transition state.
                } else {
                  console.log(
                    `Cancellation requested successfully for execution ${executionId}`
                  );
                }
              })
              .catch((error) => {
                console.error("Error sending cancellation request:", error);
                // Let polling continue
              });

            // DO NOT clear interval here. Let the interval clear itself on terminal status.
            // clearInterval(pollInterval);
          };
        })
        .catch((error) => {
          console.error("Error starting workflow execution:", error);
          // Return a no-op cleanup function in case of startup error
          return () => {};
        });
    },
    []
  );

  // Handle retry loading
  const handleRetryLoading = () => {
    if (id) {
      navigate(0);
    }
  };

  // Show error if loading failed
  if (loadError) {
    return <WorkflowError message={loadError} onRetry={handleRetryLoading} />;
  }

  // Show error if processing workflow data failed
  if (templatesError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500 mb-4">{templatesError}</p>
        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // Show loading state if templates aren't ready OR workflow is being processed
  const showLoading =
    nodeTemplates.length === 0 || (initialWorkflow && isProcessingWorkflow);

  if (showLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workflow editor...</p>
        </div>
      </div>
    );
  }

  // Handle case where initialWorkflow is null/undefined after loading checks (e.g., new workflow)
  if (
    !initialWorkflow &&
    !showLoading &&
    !loadError &&
    !hasProcessedInitialWorkflow
  ) {
    // This path might indicate a genuine loading issue not caught elsewhere,
    // or potentially the state for a brand new workflow before loader returns emptyWorkflow.
    // If loader guarantees emptyWorkflow, this might be redundant.
    // Consider adding specific handling or logging if needed.
  }

  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex flex-col relative">
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
          />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
