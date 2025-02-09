import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import React from 'react';
import styles from './workflow-node.module.css';

export interface Parameter {
  name: string;
  type: string;
}

export interface WorkflowNodeData {
  name: string;
  inputs: Parameter[];
  outputs: Parameter[];
  error?: string | null;
}

const TypeBadge = ({ type, position, id }: { type: string; position: Position; id: string }) => {
  const label = type.charAt(0).toUpperCase();
  return (
    <div className={styles.typeBadgeContainer}>
      <Handle
        type={position === Position.Left ? "target" : "source"}
        position={position}
        id={id}
        className={styles.handle}
      />
      <span className={styles.typeBadge}>
        {label}
      </span>
    </div>
  );
};

export const WorkflowNode = memo(({ data, selected }: { data: WorkflowNodeData; selected?: boolean }) => {
  return (
    <div className={`${styles.node} ${selected ? styles.selected : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>{data.name}</h3>
      </div>

      {/* Parameters */}
      <div className={styles.parameters}>
        {/* Input Parameters */}
        <div className={styles.parameterList}>
          {data.inputs.map((input, index) => (
            <div key={`input-${input.name}-${index}`} className={styles.parameter}>
              <TypeBadge type={input.type} position={Position.Left} id={input.name} />
              {input.name}
            </div>
          ))}
        </div>

        {/* Output Parameters */}
        <div className={`${styles.parameterList} ${styles.parameterListRight}`}>
          {data.outputs.map((output, index) => (
            <div key={`output-${output.name}-${index}`} className={styles.parameter}>
              {output.name}
              <TypeBadge type={output.type} position={Position.Right} id={output.name} />
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {data.error && (
        <div className={styles.error}>
          <p>{data.error}</p>
        </div>
      )}
    </div>
  );
});