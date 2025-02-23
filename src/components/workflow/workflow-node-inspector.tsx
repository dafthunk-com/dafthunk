import { Node as ReactFlowNode } from 'reactflow';

interface WorkflowNodeInspectorProps {
  node: ReactFlowNode;
}

export function WorkflowNodeInspector({ node }: WorkflowNodeInspectorProps) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">{node.data.name}</h2>
      {node.data.error && (
        <div className="mb-4 p-2 bg-red-50 text-red-600 text-sm rounded">
          {node.data.error}
        </div>
      )}
      <div className="space-y-4">

      {node.data.inputs?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Inputs</h3>
            <div className="space-y-2">
            {node.data.inputs.map((input: { name: string; type: string }, index: number) => (
              <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                <span className="text-sm">{input.name}</span>
                <span className="text-xs text-gray-500">{input.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {node.data.outputs?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Outputs</h3>
          <div className="space-y-2">
            {node.data.outputs.map((output: { name: string; type: string }, index: number) => (
              <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                <span className="text-sm">{output.name}</span>
                <span className="text-xs text-gray-500">{output.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
} 