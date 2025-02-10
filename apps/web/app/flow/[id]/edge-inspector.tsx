import { Edge as ReactFlowEdge } from 'reactflow';

interface EdgeInspectorProps {
  edge: ReactFlowEdge;
}

export function EdgeInspector({ edge }: EdgeInspectorProps) {
  return (
    <div className="p-6">
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
    </div>
  );
} 