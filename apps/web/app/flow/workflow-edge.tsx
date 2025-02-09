import { memo } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath } from 'reactflow';
import { clsx } from 'clsx';

interface WorkflowEdgeData {
  isValid?: boolean;
  isActive?: boolean;
}

export const WorkflowEdge = memo(({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}: EdgeProps<WorkflowEdgeData>) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const isValid = data?.isValid ?? true;
  const isActive = data?.isActive ?? false;

  return (
    <g>
      <path
        d={edgePath}
        className={clsx(
          'stroke-[1.5] fill-none',
          {
            'stroke-gray-300': !selected && isValid,
            'stroke-blue-500': selected && isValid,
            'stroke-red-400': !isValid,
            'animate-pulse': isActive
          }
        )}
        markerEnd={markerEnd}
      />
      {isActive && (
        <circle
          r="4"
          className={clsx(
            'fill-blue-500 animate-[moveAlongPath_2s_linear_infinite]',
            'filter drop-shadow-md'
          )}
          style={{ 
            offsetPath: `path("${edgePath}")`,
            offsetRotate: '0deg'
          }}
        />
      )}
    </g>
  );
});

WorkflowEdge.displayName = 'WorkflowEdge'; 