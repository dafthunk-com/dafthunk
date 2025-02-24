import { useCallback, useState } from 'react';
import { useLoaderData, useParams } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';
import { Workflow } from '@/lib/workflowTypes';
import { WorkflowBuilder } from '@/components/workflow/workflow-builder';
import { workflowService } from '@/services/workflowService';
import { ReactFlowProvider } from 'reactflow';

// Default empty workflow structure
const emptyWorkflow: Workflow = {
  id: '',
  name: 'New Workflow',
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
  const { workflow: initialWorkflow } = useLoaderData() as { workflow: Workflow };
  const [isSaving, setIsSaving] = useState(false);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (workflowToSave: Workflow) => {
      if (!id) return;
      
      try {
        setIsSaving(true);
        await workflowService.save(id, workflowToSave);
        console.log('Workflow saved successfully');
      } catch (err) {
        console.error('Error saving workflow:', err);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [id]
  );

  // Handle workflow changes
  const handleWorkflowChange = useCallback((updatedWorkflow: Workflow) => {
    debouncedSave(updatedWorkflow);
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
      <ReactFlowProvider>
        <WorkflowBuilder
          initialWorkflow={initialWorkflow}
          onWorkflowChange={handleWorkflowChange}
        />
      </ReactFlowProvider>
    </div>
  );
} 