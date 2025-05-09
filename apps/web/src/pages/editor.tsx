import { useCallback, useState, useEffect, useMemo, useRef } from "react";
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
import { useWorkflowDetails } from "@/hooks/use-fetch";
import { InsetLoading } from "@/components/inset-loading";
import {
  ExecutionFormDialog,
  type DialogFormParameter,
} from "@/components/workflow/execution-form-dialog";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);
  const [nodeTemplates, setNodeTemplates] = useState<NodeTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // State for the execution parameters dialog
  const [showExecutionForm, setShowExecutionForm] = useState(false);
  const [formParameters, setFormParameters] = useState<DialogFormParameter[]>([]);
  const executionContextRef = useRef<{
    workflowId: string;
    onExecution: (execution: WorkflowExecution) => void;
  } | null>(null);
  const activeEditorPageCleanupRef = useRef<(() => void) | null>(null);

  const {
    workflowDetails: currentWorkflow,
    workflowDetailsError,
    isWorkflowDetailsLoading,
  } = useWorkflowDetails(id!);

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
            description: input.description,
            hidden: input.hidden,
          })),
          outputs: type.outputs.map((output) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            description: output.description,
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
            description: input.description,
            value: input.value,
            hidden: input.hidden,
            required: input.required,
          })),
          outputs: node.outputs.map((output) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            description: output.description,
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
    async (
      currentNodes: Node<WorkflowNodeType>[],
      currentEdges: Edge<WorkflowEdgeType>[]
    ) => {
      if (!id || !currentWorkflow) return;

      try {
        if (
          currentNodes.some((node) => node.data.executionState === "executing")
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
          console.warn("Attempted to save an empty node list, aborting save.");
          return;
        }

        console.log("Saving workflow:", id);
        await workflowService.save(id, workflowToSave);
      } catch (error) {
        console.error("Error saving workflow:", error);
      }
    },
    [id, currentWorkflow]
  );

  // Create a debounced version of the save function
  const debouncedSaveWithDelay = useMemo(
    () => debounce(debouncedSave, 1000),
    [debouncedSave]
  );

  // Handle node changes
  const handleNodesChange = useCallback(
    (updatedNodes: Node<WorkflowNodeType>[]) => {
      setNodes(updatedNodes);
      if (updatedNodes.length > 0) {
        debouncedSaveWithDelay(updatedNodes, edges);
      }
    },
    [edges, debouncedSaveWithDelay]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (updatedEdges: Edge<WorkflowEdgeType>[]) => {
      setEdges(updatedEdges);
      if (nodes.length > 0) {
        debouncedSaveWithDelay(nodes, updatedEdges);
      }
    },
    [nodes, debouncedSaveWithDelay]
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

  // Simulate workflow execution - This will be refactored into performExecutionAndPoll
  const performExecutionAndPoll = useCallback(
    (
      workflowId: string,
      onExecution: (execution: WorkflowExecution) => void,
      requestBody?: Record<string, any> // For POST data
    ) => {
      console.log(
        `Starting workflow execution for ID: ${workflowId} with body:`, requestBody
      );

      const requestOptions: RequestInit = {
        method: "POST",
        credentials: "include",
      };

      if (requestBody && Object.keys(requestBody).length > 0) {
        requestOptions.headers = { "Content-Type": "application/json" };
        requestOptions.body = JSON.stringify(requestBody);
      }

      const executeUrl = new URL(
        `${API_BASE_URL}/workflows/${workflowId}/execute`
      );
      executeUrl.searchParams.append("monitorProgress", "true");

      // This entire fetch and polling logic is largely the same as original executeWorkflow
      // It now uses executeUrl.toString() and requestOptions
      // It should return the cleanup function for the polling interval

      let pollingIntervalId: NodeJS.Timeout | undefined = undefined;
      let cancelled = false;

      fetch(executeUrl.toString(), requestOptions)
        .then((response) => {
          if (cancelled) return;
          if (!response.ok) {
            // Try to parse error from backend
            return response.json().then(errData => {
              throw new Error(errData.message || `Failed to start workflow execution. Status: ${response.status}`);
            }).catch(() => {
              throw new Error(`Failed to start workflow execution. Status: ${response.status}`);
            });
          }
          return response.json();
        })
        .then(async (initialExecution: BackendWorkflowExecution) => {
          if (cancelled) return;
          const executionId = initialExecution.id;

          const updateExecutionState = (exec: BackendWorkflowExecution) => {
            onExecution({
              status: exec.status as WorkflowExecutionStatus,
              nodeExecutions: exec.nodeExecutions.map((ne) => ({
                nodeId: ne.nodeId,
                status: ne.status as any, // TODO: fix type
                outputs: ne.outputs || {},
                error: ne.error,
              })),
            });
          };

          // Initial update
          updateExecutionState(initialExecution);

          // If already completed or errored, no need to poll
          if (initialExecution.status === "completed" || initialExecution.status === "error") {
            return;
          }

          // Start polling
          pollingIntervalId = setInterval(async () => {
            if (cancelled) {
              clearInterval(pollingIntervalId);
              return;
            }
            try {
              const statusResponse = await fetch(
                `${API_BASE_URL}/executions/${executionId}`,
                {
                  credentials: "include",
                }
              );
              if (cancelled) {
                clearInterval(pollingIntervalId);
                return;
              }
              if (statusResponse.status === 404) {
                 // Execution not found, might have been deleted or completed and cleaned up
                console.warn(`Execution ${executionId} not found during polling. Stopping poll.`);
                clearInterval(pollingIntervalId);
                // Optionally update UI to a completed/stale state
                // For now, just stop polling. The last state received will remain.
                return;
              }
              if (!statusResponse.ok) {
                // Attempt to parse error, then throw generic
                try {
                  const errorData = await statusResponse.json();
                  throw new Error(errorData.message || `Failed to fetch execution status. Status: ${statusResponse.status}`);
                } catch (e) {
                  // If parsing errorData fails or it has no message, throw generic
                  throw new Error(`Failed to fetch execution status. Status: ${statusResponse.status} ${(e as Error).message}`);
                }
              }
              const execution = await statusResponse.json() as BackendWorkflowExecution;
              updateExecutionState(execution);

              if (
                execution.status === "completed" ||
                execution.status === "error"
              ) {
                clearInterval(pollingIntervalId);
              }
            } catch (error) {
              console.error("Error polling execution status:", error);
              clearInterval(pollingIntervalId);
              // Update UI to show error in polling
              onExecution({
                status: "error", // Indicate an error state for the workflow overall
                nodeExecutions: [], // Or keep existing node states and add a global error message
                error: error instanceof Error ? error.message : "Polling failed",
              });
            }
          }, 1000);
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("Error starting or processing workflow execution:", error);
          onExecution({
            status: "error",
            nodeExecutions: [],
            error: error instanceof Error ? error.message : "Failed to execute",
          });
        });

      // Return a cleanup function
      return () => {
        cancelled = true;
        if (pollingIntervalId) {
          clearInterval(pollingIntervalId);
        }
        // Request cancellation of the workflow execution on the backend
        // This part is from the original executeWorkflow, regarding DELETE to /executions/:executionId
        // We need executionId here. This implies the cleanup function should ideally be created *after* executionId is known.
        // For now, this cleanup will only stop polling.
        // The actual cancellation request (DELETE) needs executionId.
        // This is a limitation of returning cleanup synchronously before fetch resolves.
        // The original code also had this: the DELETE was in a .then() of a *different* fetch.
        // Let's keep it simple: this cleanup primarily stops polling.
        console.log(
          `Client-side polling cleanup called for workflow ID: ${workflowId}.`
        );
      };
    },
    []
  );

  // This is the function passed to WorkflowBuilder
  const executeWorkflowWrapper = useCallback(
    (
      workflowId: string,
      onExecutionFromBuilder: (execution: WorkflowExecution) => void
    ) => {
      if (activeEditorPageCleanupRef.current) {
        activeEditorPageCleanupRef.current();
        activeEditorPageCleanupRef.current = null;
      }

      const httpParameterNodes = nodes
        .filter(
          (node) =>
            node.data.nodeType?.startsWith("parameter.") && // General check
            node.data.nodeType === "parameter.string" && // Specific to string params for now
            node.data.inputs?.some((inp) => inp.id === "formFieldName")
        )
        .map((node) => {
          const formFieldNameInput = node.data.inputs.find(
            (i) => i.id === "formFieldName"
          );
          const requiredInput = node.data.inputs.find(
            (i) => i.id === "required"
          );

          const nameForFormField = formFieldNameInput?.value as string;
          if (!nameForFormField) {
            console.warn(
              `Node ${node.id} (${node.data.name}) is a parameter type but missing 'formFieldName' value. Skipping for form.`
            );
            return null;
          }

          const nodeInstanceName = node.data.name; // The name of this specific node instance in the workflow
          const fieldKey = nameForFormField; // The actual key, e.g., "customer_email"

          // Format the fieldKey into a more human-readable version for fallback
          let friendlyKeyLabel = fieldKey
            .replace(/([A-Z0-9])/g, ' $1') // Add space before capitals/numbers in a camelCase/PascalCase key
            .replace(/_/g, ' ')            // Replace underscores with spaces for snake_case keys
            .trim()                         // Remove leading/trailing spaces
            .toLowerCase();

          // Capitalize first letter of each word
          friendlyKeyLabel = friendlyKeyLabel
            .split(' ')
            .filter(word => word.length > 0) // handle multiple spaces
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          // If after formatting, it's empty (e.g. fieldKey was all underscores), fallback to raw fieldKey
          if (friendlyKeyLabel.length === 0 && fieldKey.length > 0) {
            friendlyKeyLabel = fieldKey;
          }
          
          // Prioritize the user-given node instance name, if it's specific and not the default node type name.
          // Otherwise, use the formatted field key.
          const defaultNodeTypeDisplayName = nodeTemplates.find(t => t.id === node.data.nodeType)?.name || node.data.nodeType || "";
          const isNodeNameSpecific = nodeInstanceName && 
                                   nodeInstanceName.trim() !== "" && 
                                   nodeInstanceName.toLowerCase() !== defaultNodeTypeDisplayName.toLowerCase();

          const labelText = isNodeNameSpecific
            ? nodeInstanceName
            : friendlyKeyLabel;

          return {
            nodeId: node.id,
            nameForForm: nameForFormField,
            label: labelText, // This is used for the Label and placeholder derivation
            nodeName: node.data.name || "Parameter Node", // This is for the contextual hint
            isRequired: (requiredInput?.value as boolean) ?? true,
            type: node.data.nodeType || "unknown.parameter",
          } as DialogFormParameter;
        })
        .filter((p) => p !== null) as DialogFormParameter[];

      if (httpParameterNodes.length > 0) {
        setFormParameters(httpParameterNodes);
        setShowExecutionForm(true);
        executionContextRef.current = {
          workflowId,
          onExecution: onExecutionFromBuilder,
        };
        activeEditorPageCleanupRef.current = null; // Ensure no old cleanup runs
        return undefined; // Defer execution, WorkflowBuilder gets no cleanup yet
      } else {
        // No parameters, proceed with GET request
        const cleanup = performExecutionAndPoll(
          workflowId,
          onExecutionFromBuilder
        );
        activeEditorPageCleanupRef.current = cleanup;
        return cleanup; // WorkflowBuilder gets this cleanup
      }
    },
    [nodes, performExecutionAndPoll, activeEditorPageCleanupRef, nodeTemplates] // Added nodeTemplates dependency
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
    return <InsetLoading />;
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
        {/* Add the dialog to the render tree */}
        {showExecutionForm && (
          <ExecutionFormDialog
            isOpen={showExecutionForm}
            onClose={() => setShowExecutionForm(false)}
            parameters={formParameters}
            onSubmit={(formData) => {
              setShowExecutionForm(false);
              if (executionContextRef.current) {
                const { workflowId, onExecution } = executionContextRef.current;
                // Call performExecutionAndPoll with the form data
                const cleanup = performExecutionAndPoll(
                  workflowId,
                  onExecution,
                  formData
                );
                activeEditorPageCleanupRef.current = cleanup;
              }
            }}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
