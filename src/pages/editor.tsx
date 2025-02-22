import { useCallback, useState } from 'react';
import { useLoaderData, useParams } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';
import { Graph } from '@/lib/types';
import { WorkflowEditor } from '@/components/editor/workflow-editor';
import { graphService } from '@/lib/services/graph';

// Default empty graph structure
const emptyGraph: Graph = {
  id: '',
  name: 'New Workflow',
  nodes: [],
  edges: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Loader function for React Router
export async function editorLoader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) {
    return { graph: emptyGraph };
  }

  try {
    const graph = await graphService.load(id);
    return { graph };
  } catch (error) {
    throw new Error(`Failed to load workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  const { graph: initialGraph } = useLoaderData() as { graph: Graph };
  const [isSaving, setIsSaving] = useState(false);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (graphToSave: Graph) => {
      if (!id) return;
      
      try {
        setIsSaving(true);
        await graphService.save(id, graphToSave);
        console.log('Graph saved successfully');
      } catch (err) {
        console.error('Error saving graph:', err);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [id]
  );

  // Handle graph changes
  const handleGraphChange = useCallback((updatedGraph: Graph) => {
    debouncedSave(updatedGraph);
  }, [debouncedSave]);

  return (
    <div className="w-screen h-screen fixed top-0 left-0 p-2">
      <div className="absolute top-4 right-4 z-50">
        {isSaving && (
          <div className="text-sm text-gray-500">
            Saving...
          </div>
        )}
      </div>
      <WorkflowEditor 
        initialWorkflowGraph={initialGraph} 
        onWorkflowChange={handleGraphChange}
      />
    </div>
  );
} 