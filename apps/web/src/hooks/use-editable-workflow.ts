import type { Parameter, ParameterType } from "@dafthunk/types";
import type { Edge, Node } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth-context";
import type {
  NodeTemplate,
  WorkflowEdgeType,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";
import {
  connectWorkflowWS,
  WorkflowDOState,
  WorkflowWebSocket,
} from "@/services/workflow-do-service";
import { adaptDeploymentNodesToReactFlowNodes } from "@/utils/utils";
import { debounce } from "@/utils/utils";

interface UseEditableWorkflowProps {
  workflowId: string | undefined;
  nodeTemplates?: NodeTemplate[];
}

export function useEditableWorkflow({
  workflowId,
  nodeTemplates = [],
}: UseEditableWorkflowProps) {
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [savingError, setSavingError] = useState<string | null>(null);
  const wsRef = useRef<WorkflowWebSocket | null>(null);
  const [isWSConnected, setIsWSConnected] = useState(false);
  const [workflowMetadata, setWorkflowMetadata] = useState<{
    id: string;
    name: string;
    handle: string;
    type: string;
  } | null>(null);

  const { organization } = useAuth();

  // WebSocket connection effect
  useEffect(() => {
    if (!workflowId || !organization?.handle) {
      setIsInitializing(false);
      return;
    }

    // Prevent duplicate connections if already connected
    if (wsRef.current?.isConnected()) {
      return;
    }

    setIsInitializing(true);

    // Add a small delay to avoid race conditions during React strict mode double-mount
    const timeoutId = setTimeout(() => {
      // Double-check we're not already connected after the delay
      if (wsRef.current?.isConnected()) {
        return;
      }

      const ws = connectWorkflowWS(organization.handle, workflowId, {
        onInit: (state: WorkflowDOState) => {
          console.log("🔵 [WS] Received initial state");
          console.log("  - Nodes:", state.nodes.length);
          console.log("  - Edges:", state.edges.length, state.edges);
          try {
            // Store workflow metadata - id and type are required, name and handle can be empty
            if (state.id && state.type) {
              setWorkflowMetadata({
                id: state.id,
                name: state.name || "",
                handle: state.handle || "",
                type: state.type,
              });
            }

            const reactFlowNodes = adaptDeploymentNodesToReactFlowNodes(
              state.nodes,
              nodeTemplates
            );
            const reactFlowEdges = state.edges.map(
              (edge: any, index: number) => ({
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
              })
            );

            console.log(
              "  - Converted to ReactFlow edges:",
              reactFlowEdges.length
            );
            setNodes(reactFlowNodes);
            setEdges(reactFlowEdges);
            console.log("  - Set edges in state");
            setProcessingError(null);
            setIsInitializing(false);
            console.log("  - Initialization complete");
          } catch (error) {
            console.error("Error processing WebSocket state:", error);
            setProcessingError("Failed to load state from WebSocket");
            setIsInitializing(false);
          }
        },
        onOpen: () => {
          console.log("WebSocket connected");
          setIsWSConnected(true);
        },
        onClose: () => {
          console.log("WebSocket disconnected");
          setIsWSConnected(false);
        },
        onError: (error) => {
          console.error("WebSocket error:", error);
          setSavingError(`WebSocket error: ${error}`);
          setProcessingError(`WebSocket error: ${error}`);
          setIsInitializing(false);
        },
      });

      wsRef.current = ws;
    }, 100); // Small delay to avoid double-mount issues

    return () => {
      clearTimeout(timeoutId);
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, organization?.handle]);

  const saveWorkflowInternal = useCallback(
    async (
      nodesToSave: Node<WorkflowNodeType>[],
      edgesToSave: Edge<WorkflowEdgeType>[]
    ) => {
      console.log("🟡 [SAVE] saveWorkflowInternal called");
      console.log("  - isInitializing:", isInitializing);
      console.log("  - Nodes to save:", nodesToSave.length);
      console.log("  - Edges to save:", edgesToSave.length, edgesToSave);

      // Don't save while still loading initial state from WebSocket
      if (isInitializing) {
        console.log("  - ⏸️  SKIPPED (still initializing)");
        return;
      }

      if (!workflowId) {
        setSavingError("Workflow ID is missing, cannot save.");
        return;
      }
      setSavingError(null);

      if (wsRef.current?.isConnected()) {
        try {
          const workflowNodes = nodesToSave.map((node) => {
            const incomingEdges = edgesToSave.filter(
              (edge) => edge.target === node.id
            );
            return {
              id: node.id,
              name: node.data.name,
              type: node.data.nodeType || "default",
              position: node.position,
              icon: node.data.icon,
              functionCalling: node.data.functionCalling,
              inputs: node.data.inputs.map((input) => {
                const isConnected = incomingEdges.some(
                  (edge) => edge.targetHandle === input.id
                );
                const parameterBase: Omit<Parameter, "value"> & {
                  value?: any;
                } = {
                  name: input.id,
                  type: input.type as ParameterType["type"],
                  description: input.name,
                  hidden: input.hidden,
                  required: input.required,
                  repeated: input.repeated,
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

          console.log(
            "  - 📤 Sending to WebSocket:",
            workflowEdges.length,
            "edges"
          );
          wsRef.current.send(workflowNodes, workflowEdges);
          return;
        } catch (error) {
          console.error("Error saving via WebSocket:", error);
          setSavingError("Failed to save via WebSocket");
        }
      }

      console.warn(
        "WebSocket not available, workflow changes may not be saved"
      );
      setSavingError("WebSocket not connected. Please refresh the page.");
    },
    [workflowId, isInitializing]
  );

  const saveWorkflow = useMemo(
    () =>
      debounce(
        (nodes: Node<WorkflowNodeType>[], edges: Edge<WorkflowEdgeType>[]) =>
          saveWorkflowInternal(nodes, edges),
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
    isWSConnected,
    workflowMetadata,
  };
}
