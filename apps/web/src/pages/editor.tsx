import { useCallback, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Workflow,
  Parameter,
  ParameterType,
  WorkflowExecution as BackendWorkflowExecution,
} from "@dafthunk/types";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { workflowService } from "@/services/workflowService";
import { Node, Edge, Connection } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  NodeTemplate,
  WorkflowNodeType,
  WorkflowEdgeType,
  WorkflowExecutionStatus,
  WorkflowExecution,
} from "@/components/workflow/workflow-types";
import { fetchNodeTypes } from "@/services/workflowNodeService";
import { WorkflowError } from "@/components/workflow/workflow-error";
import { API_BASE_URL } from "@/config/api";
import { debounce } from "@/utils/utils";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { toast } from "sonner";
import { useFetch } from "@/hooks/use-fetch";
import { PageLoading } from "@/components/page-loading";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);
  const [nodeTemplates, setNodeTemplates] = useState<NodeTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const {
    workflowDetails: currentWorkflow,
    workflowDetailsError,
    isWorkflowDetailsLoading,
  } = useFetch.useWorkflowDetails(id!);

  // Add breadcrumb logic
  usePageBreadcrumbs(
    [
      { label: "Playground", to: "/workflows/playground" },
      { label: currentWorkflow?.name || "Workflow" },
    ],
    [currentWorkflow?.name]
  );

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
    // If workflowDetails is loading or not yet available, or if there's an error, do nothing.
    if (isWorkflowDetailsLoading || !currentWorkflow || workflowDetailsError) {
      // If there is an error, it will be handled by the main return block
      // If it's loading, it will also be handled there.
      // If currentWorkflow is undefined (e.g. new workflow not yet created, or invalid ID),
      // we don't want to process, allow loading/error states to handle.
      return;
    }

    try {
      const reactFlowNodes = currentWorkflow.nodes.map((node) => ({
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

      const reactFlowEdges = currentWorkflow.edges.map((edge, index) => ({
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
    } catch (error) {
      console.error("Error processing workflow data:", error);
      // Error during processing of valid data, could set a specific state if needed
      // For now, relying on workflowDetailsError for load-time errors.
    }
  }, [currentWorkflow, isWorkflowDetailsLoading, workflowDetailsError]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(
      async (
        currentNodes: Node<WorkflowNodeType>[],
        currentEdges: Edge<WorkflowEdgeType>[]
      ) => {
        if (!id || !currentWorkflow) return;

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
            ...currentWorkflow,
            id: id,
            name: currentWorkflow.name,
            nodes: workflowNodes,
            edges: workflowEdges,
          };

          if (workflowNodes.length === 0 && currentWorkflow.nodes.length > 0) {
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
    [id, currentWorkflow]
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
        .then(async (initialExecution: BackendWorkflowExecution) => {
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
                (await statusResponse.json()) as BackendWorkflowExecution;
              onExecution({
                status: loadedExecution.status as WorkflowExecutionStatus,
                nodeExecutions: loadedExecution.nodeExecutions.map((ne) => ({
                  nodeId: ne.nodeId,
                  status: ne.status as any,
                  outputs: ne.outputs || {},
                  error: ne.error,
                })),
              });
            } else {
              onExecution({
                status: initialExecution.status as WorkflowExecutionStatus,
                nodeExecutions: initialExecution.nodeExecutions.map((ne) => ({
                  nodeId: ne.nodeId,
                  status: ne.status as any,
                  outputs: ne.outputs || {},
                  error: ne.error,
                })),
              });
            }
          } catch {
            onExecution({
              status: initialExecution.status as WorkflowExecutionStatus,
              nodeExecutions: initialExecution.nodeExecutions.map((ne) => ({
                nodeId: ne.nodeId,
                status: ne.status as any,
                outputs: ne.outputs || {},
                error: ne.error,
              })),
            });
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
                (await statusResponse.json()) as BackendWorkflowExecution;
              onExecution({
                status: execution.status as WorkflowExecutionStatus,
                nodeExecutions: execution.nodeExecutions.map((ne) => ({
                  nodeId: ne.nodeId,
                  status: ne.status as any,
                  outputs: ne.outputs || {},
                  error: ne.error,
                })),
              });
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

  // We need to create a wrapper executeWorkflow function that maps @dafthunk/types to our local types
  const executeWorkflowWrapper = useCallback(
    (
      workflowId: string,
      onExecution: (execution: WorkflowExecution) => void
    ) => {
      return executeWorkflow(
        workflowId,
        (localExecution: WorkflowExecution) => {
          // Our executeWorkflow function now already returns the correct local WorkflowExecution type
          onExecution(localExecution);
        }
      );
    },
    [executeWorkflow]
  );

  // Handle retry loading
  const handleRetryLoading = () => {
    if (id) {
      navigate(0);
    }
  };

  // Handle workflow deployment
  const handleDeployWorkflow = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!id) return;
      workflowService
        .deploy(id)
        .then(() => {
          toast.success("Workflow deployed successfully");
        })
        .catch((error) => {
          console.error("Error deploying workflow:", error);
          toast.error("Failed to deploy workflow. Please try again.");
        });
    },
    [id]
  );

  // Show error if loading failed
  if (workflowDetailsError) {
    return (
      <WorkflowError
        message={workflowDetailsError.message || "Failed to load workflow."}
        onRetry={handleRetryLoading}
      />
    );
  }

  // Show error if processing workflow data failed (templates error)
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
  const showNodeTemplatesLoading =
    nodeTemplates.length === 0 && !templatesError;

  if (isWorkflowDetailsLoading || showNodeTemplatesLoading) {
    return <PageLoading />;
  }

  // Handle case where initialWorkflow is null/undefined after loading checks (e.g., new workflow)
  // This logic might need adjustment or removal based on how `useWorkflowDetails` handles non-existent IDs.
  // For now, if `currentWorkflow` is null/undefined and not loading and no error, it might mean a new workflow or an issue.
  // The WorkflowBuilder should ideally handle an empty/new workflow state.
  if (
    !currentWorkflow &&
    !isWorkflowDetailsLoading &&
    !workflowDetailsError &&
    !showNodeTemplatesLoading
  ) {
    return (
      <WorkflowError
        message={`Workflow with ID "${id}" not found.`}
        onRetry={() => navigate("/workflows/playground")}
      />
    );
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
            executeWorkflow={executeWorkflowWrapper}
            onDeployWorkflow={handleDeployWorkflow}
          />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
