import type {
  Parameter,
  ParameterType,
  WorkflowExecution,
  WorkflowRuntime,
} from "@dafthunk/types";
import type { Edge, Node } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-context";
import type {
  NodeType,
  WorkflowEdgeType,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";
import {
  connectWorkflowWS,
  WorkflowState,
  WorkflowWebSocket,
} from "@/services/workflow-session-service.ts";
import { adaptDeploymentNodesToReactFlowNodes } from "@/utils/utils";

interface UseEditableWorkflowProps {
  workflowId: string | undefined;
  nodeTypes?: NodeType[];
  onExecutionUpdate?: (execution: WorkflowExecution) => void;
}

export function useEditableWorkflow({
  workflowId,
  nodeTypes = [],
  onExecutionUpdate,
}: UseEditableWorkflowProps) {
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WorkflowWebSocket | null>(null);
  const [isWSConnected, setIsWSConnected] = useState(false);
  const [workflowMetadata, setWorkflowMetadata] = useState<{
    id: string;
    name: string;
    description?: string;
    handle: string;
    trigger: string;
    runtime?: WorkflowRuntime;
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

      const handleStateUpdate = (state: WorkflowState) => {
        try {
          // Store workflow metadata
          if (state.id && state.trigger) {
            setWorkflowMetadata({
              id: state.id,
              name: state.name || "",
              description: state.description,
              handle: state.handle || "",
              trigger: state.trigger,
              runtime: state.runtime as WorkflowRuntime | undefined,
            });
          }

          // Convert to ReactFlow format
          const reactFlowNodes = adaptDeploymentNodesToReactFlowNodes(
            state.nodes,
            nodeTypes
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

          setNodes(reactFlowNodes);
          setEdges(reactFlowEdges);
        } catch (error) {
          console.error("Error processing WebSocket state:", error);
          // State processing error - close connection to force reconnect
          wsRef.current?.disconnect();
        }
      };

      const ws = connectWorkflowWS(organization.handle, workflowId, {
        // Message-level callbacks (happy path)
        onInit: (state: WorkflowState) => {
          handleStateUpdate(state);
          setIsInitializing(false);
        },
        onUpdate: (state: WorkflowState) => {
          // Handle broadcasts from other users
          handleStateUpdate(state);
        },
        onExecutionUpdate: (execution: WorkflowExecution) => {
          // Forward execution updates to parent component
          // Note: execution.error is just a summary, not an error to display
          onExecutionUpdate?.(execution);
        },

        // Connection-level callbacks (problems)
        onConnectionOpen: () => {
          setIsWSConnected(true);
          setConnectionError(null);
        },
        onConnectionClose: (event) => {
          setIsWSConnected(false);
          setIsInitializing(false);
          // Only set connection error for abnormal closures
          if (!event.wasClean && event.code !== 1000 && event.code !== 1001) {
            setConnectionError(
              `Connection closed unexpectedly (code: ${event.code})`
            );
          }
        },
        onConnectionError: (event) => {
          console.error("Connection error:", event);
          setConnectionError("Connection error occurred");
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
  }, [workflowId, organization?.handle]);

  const saveWorkflowInternal = useCallback(
    async (
      nodesToSave: Node<WorkflowNodeType>[],
      edgesToSave: Edge<WorkflowEdgeType>[]
    ) => {
      // Block saves during initialization to prevent race condition where
      // nodeTypes load before edges, causing empty edges to be saved
      if (isInitializing) {
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
                  repeated: output.repeated,
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

  const saveWorkflow = saveWorkflowInternal;

  const executeWorkflow = useCallback(
    (options?: { parameters?: Record<string, unknown> }) => {
      if (!wsRef.current?.isConnected()) {
        console.warn("WebSocket is not connected, cannot execute workflow");
        return;
      }
      wsRef.current.executeWorkflow(options);
    },
    []
  );

  return {
    nodes,
    edges,
    isInitializing,
    savingError,
    connectionError,
    saveWorkflow,
    isWSConnected,
    workflowMetadata,
    executeWorkflow,
  };
}
