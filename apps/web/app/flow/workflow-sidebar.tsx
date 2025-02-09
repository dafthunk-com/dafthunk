import { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';

interface WorkflowSidebarProps {
  node: ReactFlowNode | null;
  edge: ReactFlowEdge | null;
}

export const WorkflowSidebar = ({ node, edge }: WorkflowSidebarProps) => {
  if (!node && !edge) return null;

  return (
    <div className="h-full bg-white">
      <div className="p-6">
        {node && (
          <>
            <h2 className="text-xl font-semibold mb-4">{node.data.name}</h2>
            <div className="space-y-4">
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
            </div>
          </>
        )}

        {edge && (
          <>
            <h2 className="text-xl font-semibold mb-4">Connection</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Source</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span className="text-sm">Node</span>
                    <span className="text-xs text-gray-500">{edge.source}</span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span className="text-sm">Parameter</span>
                    <span className="text-xs text-gray-500">{edge.sourceHandle}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Target</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span className="text-sm">Node</span>
                    <span className="text-xs text-gray-500">{edge.target}</span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span className="text-sm">Parameter</span>
                    <span className="text-xs text-gray-500">{edge.targetHandle}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 