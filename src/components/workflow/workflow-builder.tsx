import { WorkflowSidebar } from "./workflow-sidebar";
import { WorkflowNodeSelector } from "./workflow-node-selector";
import { useWorkflowState } from "./useWorkflowState";
import { useWorkflowExecution } from "./useWorkflowExecution";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowBuilderProps } from "./workflow-types";
import { workflowService } from "@/services/workflowService";
import { useEffect } from "react";

export function WorkflowBuilder({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  nodeTemplates = [],
  onNodesChange,
  onEdgesChange,
  validateConnection,
  executeWorkflow,
  onExecutionStart,
  onExecutionComplete,
  onExecutionError,
  onNodeStart,
  onNodeComplete,
  onNodeError,
}: WorkflowBuilderProps) {
  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    isNodeSelectorOpen,
    setIsNodeSelectorOpen,
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    handleNodeClick,
    handleEdgeClick,
    handlePaneClick,
    handleAddNode,
    handleNodeSelect,
    updateNodeExecutionState,
    setReactFlowInstance,
    connectionValidationState,
    updateNodeData,
    updateNodeOutputs,
    updateEdgeData,
  } = useWorkflowState({
    initialNodes,
    initialEdges,
    onNodesChange,
    onEdgesChange,
    validateConnection,
  });

  const { handleExecute } = useWorkflowExecution({
    workflowId,
    updateNodeExecutionState,
    updateNodeData,
    updateNodeOutputs,
    onExecutionStart,
    onExecutionComplete,
    onExecutionError,
    onNodeStart,
    onNodeComplete,
    onNodeError,
    executeWorkflow,
  });

  // Function to save the workflow state
  const saveWorkflow = () => {
    if (!workflowId) return;
    
    try {
      // Create a workflow object from the current state
      const workflow = {
        id: workflowId,
        name: "Workflow", // Default name if no other name is available
        nodes: nodes.map(node => ({
          id: node.id,
          name: node.data.label,
          type: node.type || "",
          description: "",
          position: { x: node.position.x, y: node.position.y },
          // Convert WorkflowParameter to Parameter
          inputs: node.data.inputs.map(input => ({
            name: input.label,
            type: input.type,
            description: input.label,
            value: input.value
          })),
          outputs: node.data.outputs.map(output => ({
            name: output.label,
            type: output.type,
            description: output.label,
            value: output.value
          }))
        })),
        edges: edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          sourceOutput: edge.sourceHandle || "",
          targetInput: edge.targetHandle || "",
        })),
      };
      
      // Save the workflow to the backend
      return workflowService.save(workflowId, workflow)
        .then(() => console.log('Workflow saved successfully'))
        .catch(error => console.error('Error saving workflow:', error));
    } catch (error) {
      console.error('Error preparing workflow for save:', error);
    }
  };

  // Add event listener for saving the workflow when slider values change
  useEffect(() => {
    const handleWorkflowSave = (event: Event) => {
      // Type assertion to access the custom event detail
      const customEvent = event as CustomEvent<{
        nodeId: string;
        type: string;
        value: any;
      }>;
      
      if (customEvent.detail.type === 'slider-value-change') {
        console.log(`Saving workflow state for slider change on node ${customEvent.detail.nodeId}`);
        saveWorkflow();
      }
    };
    
    // Register the event listener
    document.addEventListener('workflow:save', handleWorkflowSave);
    
    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener('workflow:save', handleWorkflowSave);
    };
  }, [workflowId, nodes, edges]);

  const handleExecuteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Reset all nodes to idle state before execution
    nodes.forEach((node) => {
      updateNodeExecutionState(node.id, "idle");
    });
    handleExecute();
  };

  const handleCleanClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset all nodes to idle state
    nodes.forEach((node) => {
      // Reset execution state to idle
      updateNodeExecutionState(node.id, "idle");
      
      // Clear all output values by setting them to undefined
      const resetOutputs = node.data.outputs.reduce((acc, output) => {
        acc[output.id] = undefined;
        return acc;
      }, {} as Record<string, undefined>);
      
      // Update node outputs with cleared values
      updateNodeOutputs(node.id, resetOutputs);
      
      // Clear any error messages
      updateNodeData(node.id, { error: null });
    });
  };

  return (
    <div className="w-full h-full flex">
      <div
        className={`h-full rounded-xl overflow-hidden relative ${
          selectedNode || selectedEdge ? "w-[calc(100%-320px)]" : "w-full"
        }`}
      >
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          connectionValidationState={connectionValidationState}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onInit={setReactFlowInstance}
          onAddNode={handleAddNode}
          onExecute={handleExecuteClick}
          onClean={handleCleanClick}
        />
      </div>

      {(selectedNode || selectedEdge) && (
        <div className="w-80">
          <WorkflowSidebar
            node={selectedNode}
            edge={selectedEdge}
            onNodeUpdate={updateNodeData}
            onEdgeUpdate={updateEdgeData}
          />
        </div>
      )}

      <WorkflowNodeSelector
        open={isNodeSelectorOpen}
        onSelect={handleNodeSelect}
        onClose={() => setIsNodeSelectorOpen(false)}
        templates={nodeTemplates}
      />
    </div>
  );
}
