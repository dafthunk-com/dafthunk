import { memo } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath } from 'reactflow';
import styles from './workflow-edge.module.css';

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
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: !isValid ? '#ef4444' : selected ? '#666' : '#999',
          strokeWidth: selected ? 3 : 2,
          transition: 'all 0.3s ease',
          cursor: 'pointer',
        }}
      />
      {isActive && (
        <circle
          className={`${styles.activeIndicator} animate-pulse`}
          style={{ offsetPath: `path("${edgePath}")` }}
          filter="url(#glow)"
        />
      )}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </>
  );
});

WorkflowEdge.displayName = 'WorkflowEdge'; 