import type {
  Parameter,
  WorkflowExecution,
  WorkflowRuntime,
  WorkflowTrigger,
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
import { adaptBackendNodesToReactFlowNodes } from "@/utils/utils";

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
  const remoteStateRef = useRef<{
    nodes: Node<WorkflowNodeType>[];
    edges: Edge<WorkflowEdgeType>[];
  } | null>(null);
  const [isWSConnected, setIsWSConnected] = useState(false);
  const [workflowMetadata, setWorkflowMetadata] = useState<{
    id: string;
    name: string;
    description?: string;
    trigger: string;
    runtime?: WorkflowRuntime;
  } | null>(null);

  const { organization } = useAuth();

  // WebSocket connection effect
  useEffect(() => {
    if (!workflowId || !organization?.id) {
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
              trigger: state.trigger,
              runtime: state.runtime as WorkflowRuntime | undefined,
            });
          }

          // Convert to ReactFlow format
          const reactFlowNodes = adaptBackendNodesToReactFlowNodes(
            state.nodes,
            nodeTypes
          );
          const reactFlowEdges = state.edges.map((edge: any) => ({
            id: `${edge.source}:${edge.sourceOutput}-${edge.target}:${edge.targetInput}`,
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

          remoteStateRef.current = {
            nodes: reactFlowNodes,
            edges: reactFlowEdges,
          };
          setNodes(reactFlowNodes);
          setEdges(reactFlowEdges);
        } catch (error) {
          console.error("Error processing WebSocket state:", error);
          // State processing error - close connection to force reconnect
          wsRef.current?.disconnect();
        }
      };

      const ws = connectWorkflowWS(organization.id, workflowId, {
        // Message-level callbacks (happy path)
        onInit: (state: WorkflowState) => {
          handleStateUpdate(state);
          if (isInitializing) {
            setIsInitializing(false);
          } else {
            // Reconnection - server state overwrites local
            setSavingError(
              "Reconnected. Some unsaved changes may have been lost."
            );
          }
        },
        onUpdate: (state: WorkflowState) => {
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
  }, [workflowId, organization?.id]);

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
              ...(node.data.metadata
                ? { metadata: { ...node.data.metadata } }
                : {}),
              inputs: node.data.inputs.map((input) => {
                const isConnected = incomingEdges.some(
                  (edge) => edge.targetHandle === input.id
                );
                const { id: _id, value: inputValue, ...rest } = input;
                const parameter = {
                  ...rest,
                  name: input.id,
                  description: input.name,
                } as Parameter & { value?: unknown };
                if (!isConnected && typeof inputValue !== "undefined") {
                  parameter.value = inputValue;
                }
                return parameter as Parameter;
              }),
              outputs: node.data.outputs.map((output) => {
                const { id: _id, value: _value, ...rest } = output;
                return {
                  ...rest,
                  name: output.id,
                  description: output.name,
                } as Parameter;
              }),
            };
          });

          const workflowEdges = edgesToSave.map((edge) => ({
            source: edge.source,
            target: edge.target,
            sourceOutput: edge.sourceHandle || "",
            targetInput: edge.targetHandle || "",
          }));

          wsRef.current.sendStateUpdate(workflowNodes, workflowEdges);
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

  const nodesRef = useRef<Node<WorkflowNodeType>[]>([]);
  const edgesRef = useRef<Edge<WorkflowEdgeType>[]>([]);

  nodesRef.current = nodes;
  edgesRef.current = edges;

  const handleNodesChange = useCallback(
    (changedNodes: Node<WorkflowNodeType>[]) => {
      nodesRef.current = changedNodes;
      if (
        remoteStateRef.current &&
        changedNodes === remoteStateRef.current.nodes
      ) {
        remoteStateRef.current = null;
        return; // Skip save - this is a remote update being applied
      }
      if (workflowMetadata) {
        saveWorkflowInternal(changedNodes, edgesRef.current);
      }
    },
    [saveWorkflowInternal, workflowMetadata]
  );

  const handleEdgesChange = useCallback(
    (changedEdges: Edge<WorkflowEdgeType>[]) => {
      edgesRef.current = changedEdges;
      if (
        remoteStateRef.current &&
        changedEdges === remoteStateRef.current.edges
      ) {
        return; // Skip save - this is a remote update being applied
      }
      if (workflowMetadata) {
        saveWorkflowInternal(nodesRef.current, changedEdges);
      }
    },
    [saveWorkflowInternal, workflowMetadata]
  );

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

  const updateMetadata = useCallback(
    (metadata: {
      name?: string;
      description?: string;
      trigger?: WorkflowTrigger;
      runtime?: WorkflowRuntime;
    }) => {
      if (!wsRef.current?.isConnected()) {
        console.warn("WebSocket is not connected, cannot update metadata");
        return;
      }
      wsRef.current.updateMetadata(metadata);

      // Also update local metadata state for immediate UI feedback
      setWorkflowMetadata((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(metadata.name !== undefined && { name: metadata.name }),
          ...(metadata.description !== undefined && {
            description: metadata.description,
          }),
          ...(metadata.trigger !== undefined && { trigger: metadata.trigger }),
          ...(metadata.runtime !== undefined && { runtime: metadata.runtime }),
        };
      });
    },
    []
  );

  return {
    nodes,
    edges,
    isInitializing,
    savingError,
    connectionError,
    isWSConnected,
    workflowMetadata,
    handleNodesChange,
    handleEdgesChange,
    executeWorkflow,
    updateMetadata,
  };
}
