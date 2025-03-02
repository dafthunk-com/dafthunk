import { useState } from "react";
import { WorkflowBuilder } from "@/components/workflow2/workflow-builder";
import { NodeTemplate } from "@/components/workflow2/workflow-node-selector";
import { WorkflowNodeData } from "@/components/workflow2/workflow-node";
import { WorkflowEdgeData } from "@/components/workflow2/workflow-edge";
import { ExecutionEvent } from "@/components/workflow2/useWorkflowExecution";
import { Node, Edge, Connection } from "reactflow";

// Sample node templates
const nodeTemplates: NodeTemplate[] = [
  {
    id: "text-input",
    type: "input",
    label: "Text Input",
    description: "Provides a text input for the workflow",
    category: "Inputs",
    inputs: [],
    outputs: [
      {
        id: "text",
        type: "string",
        label: "Text",
      },
    ],
  },
  {
    id: "number-input",
    type: "input",
    label: "Number Input",
    description: "Provides a number input for the workflow",
    category: "Inputs",
    inputs: [],
    outputs: [
      {
        id: "number",
        type: "number",
        label: "Number",
      },
    ],
  },
  {
    id: "text-transform",
    type: "transform",
    label: "Text Transform",
    description: "Transforms text (uppercase, lowercase, etc.)",
    category: "Transformations",
    inputs: [
      {
        id: "text",
        type: "string",
        label: "Text",
      },
    ],
    outputs: [
      {
        id: "transformed",
        type: "string",
        label: "Transformed",
      },
    ],
  },
  {
    id: "math-operation",
    type: "transform",
    label: "Math Operation",
    description: "Performs math operations on numbers",
    category: "Transformations",
    inputs: [
      {
        id: "a",
        type: "number",
        label: "A",
      },
      {
        id: "b",
        type: "number",
        label: "B",
      },
    ],
    outputs: [
      {
        id: "result",
        type: "number",
        label: "Result",
      },
    ],
  },
  {
    id: "text-output",
    type: "output",
    label: "Text Output",
    description: "Displays text output",
    category: "Outputs",
    inputs: [
      {
        id: "text",
        type: "string",
        label: "Text",
      },
    ],
    outputs: [],
  },
  {
    id: "number-output",
    type: "output",
    label: "Number Output",
    description: "Displays number output",
    category: "Outputs",
    inputs: [
      {
        id: "number",
        type: "number",
        label: "Number",
      },
    ],
    outputs: [],
  },
];

// Initial nodes for the example
const initialNodes: Node<WorkflowNodeData>[] = [
  {
    id: "text-input-1",
    type: "workflowNode",
    position: { x: 100, y: 100 },
    data: {
      label: "Text Input",
      inputs: [],
      outputs: [
        {
          id: "text",
          type: "string",
          label: "Text",
        },
      ],
      executionState: "idle",
    },
  },
  {
    id: "text-transform-1",
    type: "workflowNode",
    position: { x: 400, y: 100 },
    data: {
      label: "Text Transform",
      inputs: [
        {
          id: "text",
          type: "string",
          label: "Text",
        },
      ],
      outputs: [
        {
          id: "transformed",
          type: "string",
          label: "Transformed",
        },
      ],
      executionState: "idle",
    },
  },
  {
    id: "text-output-1",
    type: "workflowNode",
    position: { x: 700, y: 100 },
    data: {
      label: "Text Output",
      inputs: [
        {
          id: "text",
          type: "string",
          label: "Text",
        },
      ],
      outputs: [],
      executionState: "idle",
    },
  },
];

// Initial edges for the example
const initialEdges: Edge<WorkflowEdgeData>[] = [
  {
    id: "edge-1",
    source: "text-input-1",
    target: "text-transform-1",
    sourceHandle: "text",
    targetHandle: "text",
    type: "workflowEdge",
    data: {
      isValid: true,
      sourceType: "string",
      targetType: "string",
    },
  },
  {
    id: "edge-2",
    source: "text-transform-1",
    target: "text-output-1",
    sourceHandle: "transformed",
    targetHandle: "text",
    type: "workflowEdge",
    data: {
      isValid: true,
      sourceType: "string",
      targetType: "string",
    },
  },
];

export default function WorkflowExample() {
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeData>[]>(initialEdges);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);

  // Validate connections based on type compatibility
  const validateConnection = (connection: Connection) => {
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

    // Check if types are compatible
    return sourceOutput.type === targetInput.type;
  };

  // Handle node changes
  const handleNodesChange = (updatedNodes: Node<WorkflowNodeData>[]) => {
    setNodes(updatedNodes);
  };

  // Handle edge changes
  const handleEdgesChange = (updatedEdges: Edge<WorkflowEdgeData>[]) => {
    setEdges(updatedEdges);
  };

  // Simulate workflow execution
  const executeWorkflow = (
    workflowId: string,
    callbacks: {
      onEvent: (event: ExecutionEvent) => void;
      onComplete: () => void;
      onError: (error: string) => void;
    }
  ) => {
    // Clear logs
    setExecutionLogs([]);
    addLog(`Starting workflow execution for workflow: ${workflowId}...`);

    // Get all nodes with no inputs (starting nodes)
    const startNodes = nodes.filter((node) => node.data.inputs.length === 0);

    if (startNodes.length === 0) {
      callbacks.onError("No starting nodes found");
      addLog("Error: No starting nodes found");
      return;
    }

    // Process each starting node
    startNodes.forEach((node) => {
      setTimeout(() => {
        processNode(node, {});
      }, 500);
    });

    // Simulate node processing
    const processNode = (node: Node<WorkflowNodeData>, inputs: Record<string, any>) => {
      // Notify that node execution started
      callbacks.onEvent({
        type: "node-start",
        nodeId: node.id,
      });
      addLog(`Node ${node.data.label} (${node.id}) started execution`);

      // Simulate processing time
      setTimeout(() => {
        try {
          // Generate outputs based on node type
          const outputs = generateOutputs(node, inputs);

          // Notify that node execution completed
          callbacks.onEvent({
            type: "node-complete",
            nodeId: node.id,
            outputs,
          });
          addLog(`Node ${node.data.label} (${node.id}) completed execution`);

          // Find outgoing edges
          const outgoingEdges = edges.filter((edge) => edge.source === node.id);

          // Process connected nodes
          outgoingEdges.forEach((edge) => {
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (targetNode) {
              // Prepare inputs for the target node
              const targetInputs = { ...inputs };
              if (edge.sourceHandle && edge.targetHandle) {
                targetInputs[edge.targetHandle] = outputs[edge.sourceHandle];
              }

              // Process the target node
              setTimeout(() => {
                processNode(targetNode, targetInputs);
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
              addLog("Workflow execution completed");
            }
          }
        } catch (error) {
          // Notify that node execution failed
          callbacks.onEvent({
            type: "node-error",
            nodeId: node.id,
            error: error instanceof Error ? error.message : String(error),
          });
          addLog(`Node ${node.data.label} (${node.id}) failed: ${error}`);
        }
      }, 1000);
    };

    // Generate outputs based on node type
    const generateOutputs = (
      node: Node<WorkflowNodeData>,
      inputs: Record<string, any>
    ): Record<string, any> => {
      const outputs: Record<string, any> = {};

      // Handle different node types
      if (node.data.label === "Text Input") {
        outputs.text = "Sample input text";
      } else if (node.data.label === "Number Input") {
        outputs.number = 42;
      } else if (node.data.label === "Text Transform") {
        if (inputs.text) {
          outputs.transformed = inputs.text.toUpperCase();
        } else {
          throw new Error("Missing input: text");
        }
      } else if (node.data.label === "Math Operation") {
        if (inputs.a !== undefined && inputs.b !== undefined) {
          outputs.result = inputs.a + inputs.b;
        } else {
          throw new Error("Missing inputs: a or b");
        }
      }

      return outputs;
    };

    // Return a cleanup function
    return () => {
      addLog("Execution cancelled");
    };
  };

  // Add a log entry
  const addLog = (message: string) => {
    setExecutionLogs((prev) => [...prev, `${new Date().toISOString().split("T")[1].split(".")[0]} - ${message}`]);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold">Workflow Builder Example</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 h-full">
          <WorkflowBuilder
            workflowId="example-workflow"
            initialNodes={nodes}
            initialEdges={edges}
            nodeTemplates={nodeTemplates}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            validateConnection={validateConnection}
            executeWorkflow={executeWorkflow}
            onExecutionStart={() => addLog("Execution started")}
            onExecutionComplete={() => addLog("Execution completed")}
            onExecutionError={(error) => addLog(`Execution error: ${error}`)}
            onNodeStart={(nodeId) => addLog(`Node ${nodeId} started`)}
            onNodeComplete={(nodeId) => addLog(`Node ${nodeId} completed`)}
            onNodeError={(nodeId, error) => addLog(`Node ${nodeId} error: ${error}`)}
          />
        </div>
        <div className="w-80 bg-gray-100 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-2">Execution Logs</h2>
          <div className="bg-black text-green-400 p-2 rounded font-mono text-xs h-full overflow-y-auto">
            {executionLogs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Execute the workflow to see logs.</p>
            ) : (
              executionLogs.map((log, index) => <div key={index}>{log}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 