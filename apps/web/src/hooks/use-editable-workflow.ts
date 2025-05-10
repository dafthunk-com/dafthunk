import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Node,
  Edge,
} from '@xyflow/react';
import type {
  WorkflowNodeType,
  WorkflowEdgeType,
} from '@/components/workflow/workflow-types'; // Corrected import path
import type { Workflow, Parameter, ParameterType } from '@dafthunk/types';
import { adaptDeploymentNodesToReactFlowNodes } from '@/utils/utils';
import { workflowService } from '@/services/workflowService';
import { debounce } from '@/utils/utils';

interface UseEditableWorkflowProps {
  workflowId: string | undefined;
  currentWorkflow: Workflow | null | undefined;
  isWorkflowDetailsLoading: boolean;
  workflowDetailsError: Error | null;
}

export function useEditableWorkflow({
  workflowId,
  currentWorkflow,
  isWorkflowDetailsLoading,
  workflowDetailsError,
}: UseEditableWorkflowProps) {
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [savingError, setSavingError] = useState<string | null>(null);

  // Effect to initialize nodes and edges from currentWorkflow
  useEffect(() => {
    if (isWorkflowDetailsLoading) {
      setIsInitializing(true);
      return;
    }

    if (workflowDetailsError || !currentWorkflow) {
      setIsInitializing(false);
      if (workflowDetailsError) {
        setProcessingError(
          workflowDetailsError.message || 'Failed to load workflow data.'
        );
      }
      return;
    }

    try {
      const reactFlowNodes = adaptDeploymentNodesToReactFlowNodes(
        currentWorkflow.nodes
      );
      const reactFlowEdges = currentWorkflow.edges.map((edge, index) => ({
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

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
      setProcessingError(null);
    } catch (error) {
      console.error('Error processing workflow data into React Flow:', error);
      setProcessingError(
        error instanceof Error
          ? error.message
          : 'Error adapting workflow data for editor.'
      );
      setNodes([]);
      setEdges([]);
    } finally {
      setIsInitializing(false);
    }
  }, [
    currentWorkflow,
    isWorkflowDetailsLoading,
    workflowDetailsError,
    // adaptDeploymentNodesToReactFlowNodes removed from deps as it's a stable import
  ]);

  const debouncedSave = useCallback(
    async (
      currentNodesToSave: Node<WorkflowNodeType>[],
      currentEdgesToSave: Edge<WorkflowEdgeType>[],
      workflowToUpdate: Workflow 
    ) => {
      if (!workflowId || !workflowToUpdate) {
        setSavingError('Workflow ID or data is missing, cannot save.');
        return;
      }
      setSavingError(null);

      try {
        if (
          currentNodesToSave.some((node) => node.data.executionState === 'executing')
        ) {
          console.log(
            'Workflow is executing, but still saving legitimate changes'
          );
        }

        const workflowNodes = currentNodesToSave.map((node) => {
          const incomingEdges = currentEdgesToSave.filter(
            (edge) => edge.target === node.id
          );
          return {
            id: node.id,
            name: node.data.name,
            type: node.data.nodeType || 'default',
            position: node.position,
            inputs: node.data.inputs.map((input) => {
              const isConnected = incomingEdges.some(
                (edge) => edge.targetHandle === input.id
              );
              const parameterBase: Omit<Parameter, 'value'> & { value?: any } = {
                name: input.id,
                type: input.type as ParameterType['type'],
                description: input.name,
                hidden: input.hidden,
                required: input.required,
              };
              if (!isConnected && typeof input.value !== 'undefined') {
                parameterBase.value = input.value;
              }
              return parameterBase as Parameter;
            }),
            outputs: node.data.outputs.map((output) => {
              const parameter: Parameter = {
                name: output.id,
                type: output.type as ParameterType['type'],
                description: output.name,
                hidden: output.hidden,
              };
              return parameter;
            }),
          };
        });

        const workflowEdges = currentEdgesToSave.map((edge) => ({
          source: edge.source,
          target: edge.target,
          sourceOutput: edge.sourceHandle || '',
          targetInput: edge.targetHandle || '',
        }));

        const workflowToSave: Workflow = {
          ...workflowToUpdate,
          id: workflowId,
          name: workflowToUpdate.name,
          nodes: workflowNodes,
          edges: workflowEdges,
        };

        console.log('Saving workflow via useEditableWorkflow:', workflowId);
        await workflowService.save(workflowId, workflowToSave);
      } catch (error) {
        console.error('Error saving workflow via useEditableWorkflow:', error);
        setSavingError(
          error instanceof Error ? error.message : 'Failed to save workflow.'
        );
      }
    },
    [workflowId]
  );

  const debouncedSaveWithDelay = useMemo(
    () => 
      debounce(
        (nodesToSave: Node<WorkflowNodeType>[], edgesToSave: Edge<WorkflowEdgeType>[], wfToUpdate: Workflow) => 
          debouncedSave(nodesToSave, edgesToSave, wfToUpdate),
        1000
      ),
    [debouncedSave]
  );

  const onNodesChange = useCallback(
    (updatedNodes: Node<WorkflowNodeType>[]) => {
      setNodes(updatedNodes);
      if (currentWorkflow) {
        debouncedSaveWithDelay(updatedNodes, edges, currentWorkflow);
      }
    },
    [edges, debouncedSaveWithDelay, currentWorkflow]
  );

  const onEdgesChange = useCallback(
    (updatedEdges: Edge<WorkflowEdgeType>[]) => {
      setEdges(updatedEdges);
      if (currentWorkflow && nodes.length > 0) {
        debouncedSaveWithDelay(nodes, updatedEdges, currentWorkflow);
      }
    },
    [nodes, debouncedSaveWithDelay, currentWorkflow]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    isInitializing,
    processingError,
    savingError,
  };
} 