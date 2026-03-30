import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDatabases } from "@/services/database-service";
import { cn } from "@/utils/utils";
import { updateNodeInput, useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";
import { DatabaseCreateDialog } from "./database-create-dialog";

const CREATE_NEW_SENTINEL = "__create_new__";

interface DatabaseTriggerInputProps extends BaseWidgetProps {
  nodeId: string;
  databaseId: string;
  inputs: WorkflowParameter[];
}

function DatabaseTriggerInputWidget({
  nodeId,
  databaseId,
  inputs,
  className,
  disabled = false,
}: DatabaseTriggerInputProps) {
  const { databases, isDatabasesLoading, mutateDatabases } = useDatabases();
  const { updateNodeData, edges, deleteEdge } = useWorkflow();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleDatabaseChange = (value: string) => {
    if (value === CREATE_NEW_SENTINEL) {
      setIsCreateDialogOpen(true);
      return;
    }
    updateNodeInput(
      nodeId,
      "databaseId",
      value,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
  };

  const handleDatabaseCreated = async (newDatabaseId: string) => {
    await mutateDatabases();
    updateNodeInput(
      nodeId,
      "databaseId",
      newDatabaseId,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
    setIsCreateDialogOpen(false);
  };

  return (
    <div className={cn("p-2", className)}>
      <Select
        value={databaseId || ""}
        onValueChange={handleDatabaseChange}
        disabled={disabled || isDatabasesLoading}
      >
        <SelectTrigger className="h-6 text-xs">
          <SelectValue
            placeholder={
              isDatabasesLoading ? "Loading..." : "Select a database"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {databases.map((database) => (
            <SelectItem key={database.id} value={database.id}>
              {database.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_NEW_SENTINEL}>+ New Database</SelectItem>
        </SelectContent>
      </Select>
      <DatabaseCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={handleDatabaseCreated}
      />
    </div>
  );
}

export const databaseTriggerInputWidget = createWidget({
  component: DatabaseTriggerInputWidget,
  nodeTypes: [
    "database-query",
    "database-execute",
    "database-import-table",
    "database-export-table",
    "database-describe-table",
    "database-list-tables",
    "database-get-row-count",
    "database-drop-table",
    "database-truncate-table",
    "database-table-exists",
  ],
  inputField: "databaseId",
  managedFields: [],
  extractConfig: (nodeId, inputs) => ({
    nodeId,
    databaseId: getInputValue(inputs, "databaseId", ""),
    inputs,
  }),
});
