import type { Parameter, ParameterType, Workflow } from "@dafthunk/types";
import type { Edge, Node } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth-context";
import type {
  WorkflowEdgeType,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types"; // Corrected import path
import { updateWorkflow } from "@/services/workflow-service";
import { adaptDeploymentNodesToReactFlowNodes } from "@/utils/utils";
import { debounce } from "@/utils/utils";

interface UseEditableWorkflowProps {
  workflowId: string | undefined;
  currentWorkflow: Workflow | null | undefined;
  isWorkflowDetailsLoading: boolean;
  workflowDetailsError: Error | null;
}

export function useEditableWorkflow({
  workflowId,
  currentWorkflow,
  isWorkflowDetailsLoading,
  workflowDetailsError,
}: UseEditableWorkflowProps) {
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [savingError, setSavingError] = useState<string | null>(null);

  // Get the organization from the auth context at the hook level
  const { organization } = useAuth();

  // Effect to initialize nodes and edges from currentWorkflow
  useEffect(() => {
    if (isWorkflowDetailsLoading) {
      setIsInitializing(true);
      return;
    }

    if (workflowDetailsError || !currentWorkflow) {
      setIsInitializing(false);
      if (workflowDetailsError) {
        setProcessingError(
          workflowDetailsError.message || "Failed to load workflow data."
        );
      }
      setNodes([]);
      setEdges([]);
      return;
    }

    try {
      const reactFlowNodes = adaptDeploymentNodesToReactFlowNodes(
        currentWorkflow.nodes
      );
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
      setProcessingError(null);
    } catch (error) {
      console.error("Error processing workflow data into React Flow:", error);
      setProcessingError(
        error instanceof Error
          ? error.message
          : "Error adapting workflow data for editor."
      );
      setNodes([]);
      setEdges([]);
    } finally {
      setIsInitializing(false);
    }
  }, [currentWorkflow, isWorkflowDetailsLoading, workflowDetailsError]);

  const saveWorkflowInternal = useCallback(
    async (
      nodesToSave: Node<WorkflowNodeType>[],
      edgesToSave: Edge<WorkflowEdgeType>[],
      workflowToUpdate: Workflow // This is the base currentWorkflow
    ) => {
      if (!workflowId || !workflowToUpdate) {
        setSavingError("Workflow ID or base data is missing, cannot save.");
        return;
      }
      setSavingError(null);

      try {
        // Check if any node is currently executing, purely for logging/awareness.
        // The actual node.data.executionState should be handled by the UI layer (useWorkflowState)
        // and those updated nodes/edges are what we receive in nodesToSave/edgesToSave.
        if (
          nodesToSave.some((node) => node.data.executionState === "executing")
        ) {
          console.log(
            "Workflow elements are in an executing state during save."
          );
        }

        const workflowNodes = nodesToSave.map((node) => {
          const incomingEdges = edgesToSave.filter(
            (edge) => edge.target === node.id
          );
          return {
            id: node.id,
            name: node.data.name,
            type: node.data.nodeType || "default", // Ensure nodeType is present
            position: node.position,
            inputs: node.data.inputs.map((input) => {
              const isConnected = incomingEdges.some(
                (edge) => edge.targetHandle === input.id
              );
              const parameterBase: Omit<Parameter, "value"> & { value?: any } =
                {
                  name: input.id,
                  type: input.type as ParameterType["type"],
                  description: input.name,
                  hidden: input.hidden,
                  required: input.required,
                };
              if (!isConnected && typeof input.value !== "undefined") {
                parameterBase.value = input.value;
              }
              return parameterBase as Parameter;
            }),
            outputs: node.data.outputs.map((output) => {
              const parameter: Parameter = {
                name: output.id,
                type: output.type as ParameterType["type"],
                description: output.name,
                hidden: output.hidden,
                // value is not part of output parameters definition in the backend model here
              };
              return parameter;
            }),
          };
        });

        const workflowEdges = edgesToSave.map((edge) => ({
          source: edge.source,
          target: edge.target,
          sourceOutput: edge.sourceHandle || "",
          targetInput: edge.targetHandle || "",
        }));

        const workflowToSave: Workflow = {
          ...workflowToUpdate, // Base workflow details like name, description etc.
          id: workflowId, // Ensure the ID is correctly set
          nodes: workflowNodes,
          edges: workflowEdges,
        };

        console.log(
          "Saving workflow via useEditableWorkflow:",
          workflowId,
          workflowToSave
        );

        const orgHandle = organization?.handle;

        if (!orgHandle) {
          throw new Error("Organization handle is required to save workflow");
        }

        await updateWorkflow(workflowId, workflowToSave, orgHandle);
      } catch (error) {
        console.error("Error saving workflow via useEditableWorkflow:", error);
        setSavingError(
          error instanceof Error ? error.message : "Failed to save workflow."
        );
      }
    },
    [workflowId, organization] // Add organization to dependency array
  );

  const saveWorkflow = useMemo(
    () =>
      debounce(
        (
          nodes: Node<WorkflowNodeType>[],
          edges: Edge<WorkflowEdgeType>[],
          baseWorkflow: Workflow
        ) => saveWorkflowInternal(nodes, edges, baseWorkflow),
        1000
      ),
    [saveWorkflowInternal]
  );

  return {
    nodes,
    edges,
    isInitializing,
    processingError,
    savingError,
    saveWorkflow,
  };
}
