import { useCallback, useState, useEffect } from "react";
import { useLoaderData, useParams } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { Workflow } from "@/lib/workflowTypes";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { workflowService } from "@/services/workflowService";
import { NodeTemplate } from "@/components/workflow/workflow-node-selector";
import { ExecutionEvent } from "@/components/workflow/useWorkflowExecution";
import { Node, Edge, Connection } from "reactflow";
import { WorkflowNodeData } from "@/components/workflow/workflow-node";
import { WorkflowEdgeData } from "@/components/workflow/workflow-edge";
import { fetchNodeTypes } from "@/services/workflowNodeService";

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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
        const templates: NodeTemplate[] = types.map(type => ({
          id: type.id,
          type: type.type,
          label: type.name, // Map name to label
          description: type.description,
          category: type.category,
          inputs: type.inputs.map(input => ({
            id: input.name,
            type: input.type,
            label: input.name,
          })),
          outputs: type.outputs.map(output => ({
            id: output.name,
            type: output.type,
            label: output.name,
          })),
        }));
        setNodeTemplates(templates);
        setTemplatesError(null);
      } catch (err) {
        setTemplatesError("Failed to load node templates. Please try again later.");
      }
    };

    loadNodeTemplates();
  }, []);

  // Convert the initial workflow to ReactFlow nodes and edges
  useEffect(() => {
    if (!initialWorkflow) {
      setIsLoading(false);
      return;
    }
    
    try {
      // Convert nodes
      const reactFlowNodes = initialWorkflow.nodes.map((node) => ({
        id: node.id,
        type: 'workflowNode',
        position: node.position,
        data: {
          label: node.name,
          inputs: node.inputs.map(input => ({
            id: input.name,
            type: input.type,
            label: input.description || input.name,
          })),
          outputs: node.outputs.map(output => ({
            id: output.name,
            type: output.type,
            label: output.description || output.name,
          })),
          executionState: 'idle' as const,
        },
      }));

      // Convert edges
      const reactFlowEdges = initialWorkflow.edges.map((edge, index) => ({
        id: `e${index}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceOutput,
        targetHandle: edge.targetInput,
        type: 'workflowEdge',
        data: {
          isValid: true,
          sourceType: edge.sourceOutput,
          targetType: edge.targetInput,
        },
      }));
      
      // Set the state with the converted data
      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      // Error handling without logging
    } finally {
      setIsLoading(false);
    }
  }, [initialWorkflow]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (nodes: Node<WorkflowNodeData>[], edges: Edge<WorkflowEdgeData>[]) => {
      if (!id) return;

      try {
        setIsSaving(true);
        
        // Convert ReactFlow nodes back to workflow nodes
        const workflowNodes = nodes.map(node => ({
          id: node.id,
          name: node.data.label,
          type: node.type === 'workflowNode' ? 'default' : node.type || 'default',
          position: node.position,
          inputs: node.data.inputs.map(input => ({
            name: input.id,
            type: input.type,
            description: input.label,
          })),
          outputs: node.data.outputs.map(output => ({
            name: output.id,
            type: output.type,
            description: output.label,
          })),
        }));

        // Convert ReactFlow edges back to workflow edges
        const workflowEdges = edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          sourceOutput: edge.sourceHandle || '',
          targetInput: edge.targetHandle || '',
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
      } catch (err) {
        // Error handling without logging
      } finally {
        setIsSaving(false);
      }
    }, 1000),
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
  const validateConnection = useCallback((connection: Connection) => {
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
    return sourceOutput.type === targetInput.type || 
           sourceOutput.type === 'any' || 
           targetInput.type === 'any';
  }, [nodes]);

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
      // This is a simulation of the server-side execution
      // In a real implementation, this would be an API call to execute the workflow with the given ID
      console.log(`Executing workflow with ID: ${workflowId}`);
      
      // Get all nodes with no incoming edges (start nodes)
      const startNodes = nodes.filter((node) => {
        return !edges.some((edge) => edge.target === node.id);
      });
      
      if (startNodes.length === 0) {
        callbacks.onError("No start nodes found in the workflow");
        return;
      }
      
      // Process each start node
      startNodes.forEach((startNode) => {
        setTimeout(() => {
          processNode(startNode.id);
        }, 500);
      });
      
      // Process a node by ID
      function processNode(nodeId: string) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;
        
        // Notify that node execution started
        callbacks.onEvent({
          type: "node-start",
          nodeId: nodeId,
        });
        
        // Simulate processing time
        setTimeout(() => {
          try {
            // Generate outputs based on node type
            const outputs: Record<string, any> = {};
            node.data.outputs.forEach((output) => {
              outputs[output.id] = `Output from ${node.data.label}`;
            });
            
            // Notify that node execution completed
            callbacks.onEvent({
              type: "node-complete",
              nodeId: nodeId,
              outputs: outputs,
            });
            
            // Find all outgoing edges from this node
            const outgoingEdges = edges.filter((edge) => edge.source === nodeId);
            
            // Process all target nodes
            outgoingEdges.forEach((edge) => {
              const targetNode = nodes.find((n) => n.id === edge.target);
              if (targetNode) {
                // Prepare inputs for the target node
                const targetInputs: Record<string, any> = {};
                if (edge.sourceHandle && edge.targetHandle) {
                  targetInputs[edge.targetHandle] = outputs[edge.sourceHandle];
                }
                
                // Process the target node after a delay
                setTimeout(() => {
                  processNode(targetNode.id);
                }, 500);
              }
            });
            
            // Check if this is an end node (no outgoing edges)
            if (outgoingEdges.length === 0) {
              // Check if all nodes have been processed
              const remainingNodes = nodes.filter(
                (n) => n.data.executionState !== "completed" && n.data.executionState !== "error"
              );
              
              if (remainingNodes.length === 0) {
                callbacks.onComplete();
              }
            }
          } catch (error) {
            // Notify that node execution failed
            callbacks.onEvent({
              type: "node-error",
              nodeId: nodeId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }, 1000);
      }
      
      // Return a cleanup function
      return () => {
        // Cleanup without logging
      };
    },
    [nodes, edges]
  );

  return (
    <div className="w-screen h-screen fixed top-0 left-0 p-2">
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
        {isLoading && <div className="text-sm bg-blue-100 p-2 rounded-md">Loading workflow...</div>}
        {isSaving && <div className="text-sm bg-yellow-100 p-2 rounded-md">Saving...</div>}
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading workflow...</p>
          </div>
        </div>
      ) : nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-muted-foreground mb-4">No nodes in this workflow yet</p>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={() => {
              const newNode = {
                id: `input-${Date.now()}`,
                type: 'workflowNode',
                position: { x: window.innerWidth / 2 - 75, y: window.innerHeight / 2 - 75 },
                data: {
                  label: 'Input',
                  inputs: [],
                  outputs: [
                    {
                      id: 'output',
                      type: 'any',
                      label: 'Output',
                    },
                  ],
                  executionState: 'idle' as const,
                },
              };
              setNodes([newNode]);
            }}
          >
            Add a starter node
          </button>
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
        <WorkflowBuilder
          key={`workflow-${nodes.length}-${edges.length}`}
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
            const resetNodes = nodes.map(node => ({
              ...node,
              data: {
                ...node.data,
                executionState: 'idle' as const
              }
            }));
            setNodes(resetNodes);
          }}
          onExecutionComplete={() => {}}
          onExecutionError={() => {}}
          onNodeStart={() => {}}
          onNodeComplete={() => {}}
          onNodeError={() => {}}
        />
      )}
    </div>
  );
}
