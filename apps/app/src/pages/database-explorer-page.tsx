import "@xyflow/react/dist/style.css";

import type {
  DatabaseSchemaColumn,
  DatabaseSchemaTable,
} from "@dafthunk/types";
import dagre from "@dagrejs/dagre";
import type { Edge, Node, NodeProps } from "@xyflow/react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import ArrowUp01 from "lucide-react/icons/arrow-up-0-1";
import Asterisk from "lucide-react/icons/asterisk";
import Hash from "lucide-react/icons/hash";
import KeyRound from "lucide-react/icons/key-round";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useDatabase, useDatabaseSchema } from "@/services/database-service";
import { cn } from "@/utils/utils";

// --- Schema Table Node ---

interface SchemaTableNodeData extends Record<string, unknown> {
  tableName: string;
  columns: DatabaseSchemaColumn[];
}

function SchemaTableNode({ data }: NodeProps<Node<SchemaTableNodeData>>) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] min-w-[240px]">
      <div className="px-4 py-2 border-b border-border bg-neutral-200 dark:bg-neutral-700 rounded-t-[11px]">
        <span className="font-semibold text-sm">{data.tableName}</span>
      </div>
      <div>
        {data.columns.map((col, i) => (
          <div
            key={col.name}
            className={cn(
              "relative flex items-center justify-between gap-6 px-4 py-2 text-[13px]",
              i < data.columns.length - 1 && "border-b border-border"
            )}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={`${data.tableName}-${col.name}-target`}
              className="w-[9px]! h-[9px]! bg-muted! border-[1.5px]! border-border!"
              isConnectable={false}
            />
            <span
              className={cn(
                "flex items-center gap-1",
                col.primaryKey ? "font-semibold" : "text-foreground/80"
              )}
            >
              {col.primaryKey && (
                <KeyRound className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              {col.autoIncrement && (
                <ArrowUp01 className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              {col.unique && (
                <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              {col.notnull && !col.primaryKey && (
                <Asterisk className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              {col.name}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground/60 font-light uppercase">
              {col.defaultValue !== null && (
                <span className="text-[11px] normal-case font-normal bg-muted px-1 py-0.5 rounded text-muted-foreground">
                  {col.defaultValue}
                </span>
              )}
              {col.type || "TEXT"}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={`${data.tableName}-${col.name}-source`}
              className="w-[9px]! h-[9px]! bg-muted! border-[1.5px]! border-border!"
              isConnectable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const nodeTypes = { schemaTable: SchemaTableNode };

// --- Layout ---

function applyDagreLayout(
  nodes: Node<SchemaTableNodeData>[],
  edges: Edge[]
): Node<SchemaTableNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 150 });

  for (const node of nodes) {
    const width = node.measured?.width || 220;
    const height = node.measured?.height || 200;
    g.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    const width = node.measured?.width || 220;
    const height = node.measured?.height || 200;
    return {
      ...node,
      position: { x: pos.x - width / 2, y: pos.y - height / 2 },
    };
  });
}

// --- Flow Canvas ---

interface SchemaFlowCanvasProps {
  tables: DatabaseSchemaTable[];
}

function SchemaFlowCanvas({ tables }: SchemaFlowCanvasProps) {
  const { fitView } = useReactFlow();
  const layoutApplied = useRef(false);
  const nodesInitialized = useNodesInitialized();

  const { initialNodes, edges } = useMemo(() => {
    const nodes: Node<SchemaTableNodeData>[] = tables.map((table, i) => ({
      id: table.name,
      type: "schemaTable",
      position: { x: i * 300, y: 0 },
      data: { tableName: table.name, columns: table.columns },
    }));

    const edgeList: Edge[] = tables.flatMap((table) =>
      table.foreignKeys
        .map((fk) => {
          // When REFERENCES omits the column, SQLite returns empty string;
          // fall back to the primary key column of the referenced table.
          let targetCol = fk.referencedColumn;
          if (!targetCol) {
            const refTable = tables.find((t) => t.name === fk.referencedTable);
            const pk = refTable?.columns.find((c) => c.primaryKey);
            if (!pk) return null;
            targetCol = pk.name;
          }
          return {
            id: `${table.name}-${fk.column}-${fk.referencedTable}-${targetCol}`,
            source: table.name,
            sourceHandle: `${table.name}-${fk.column}-source`,
            target: fk.referencedTable,
            targetHandle: `${fk.referencedTable}-${targetCol}-target`,
            type: "smoothstep",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
            },
          };
        })
        .filter((e) => e !== null)
    );

    return { initialNodes: nodes, edges: edgeList };
  }, [tables]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  // Apply layout once after nodes are measured
  const applyLayout = useCallback(() => {
    if (layoutApplied.current) return;
    layoutApplied.current = true;
    setNodes((nds) => applyDagreLayout(nds, edges));
    setTimeout(() => fitView({ padding: 0.2, maxZoom: 1 }), 50);
  }, [setNodes, edges, fitView]);

  useEffect(() => {
    if (nodesInitialized && !layoutApplied.current) {
      applyLayout();
    }
  }, [nodesInitialized, applyLayout]);

  if (tables.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        This database has no tables yet.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      nodeTypes={nodeTypes}
      nodesConnectable={false}
      elementsSelectable={false}
      fitView
      fitViewOptions={{ padding: 0 }}
      minZoom={0.1}
      maxZoom={4}
    >
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

// --- Page ---

export function DatabaseExplorerPage() {
  const { id } = useParams<{ id: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const { database, databaseError, isDatabaseLoading } = useDatabase(
    id || null
  );
  const { schema, schemaError, isSchemaLoading } = useDatabaseSchema(
    id || null
  );

  useEffect(() => {
    if (database) {
      setBreadcrumbs([
        { label: "Databases", to: "/databases" },
        { label: database.name, to: `/databases/${id}` },
        { label: "Explorer" },
      ]);
    }
  }, [setBreadcrumbs, database, id]);

  if (isDatabaseLoading || isSchemaLoading) {
    return <InsetLoading title="Database Explorer" />;
  }

  if (databaseError || !database) {
    return (
      <InsetError
        title="Database Explorer"
        errorMessage={databaseError?.message || "Database not found"}
      />
    );
  }

  if (schemaError) {
    return (
      <InsetError
        title="Database Explorer"
        errorMessage={schemaError.message}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-neutral-50 dark:bg-neutral-800 px-6 py-4 flex items-center">
        <h1 className="text-xl font-semibold">{database.name} - Explorer</h1>
      </div>
      <div className="flex-1 min-h-0">
        <ReactFlowProvider>
          <SchemaFlowCanvas tables={schema?.tables || []} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
