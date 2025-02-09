import { Node as ReactFlowNode } from 'reactflow';

interface WorkflowSidebarProps {
  node: ReactFlowNode | null;
}

export const WorkflowSidebar = ({ node }: WorkflowSidebarProps) => {
  if (!node) return null;

  return (
    <div className="h-full bg-white">
      <div className="p-6">
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
      </div>
    </div>
  );
}; 