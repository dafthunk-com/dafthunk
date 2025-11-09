import Database from "lucide-react/icons/database";
import RefreshCw from "lucide-react/icons/refresh-cw";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDatabases } from "@/services/database-service";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface DatabaseSelectorWidgetProps extends BaseWidgetProps {
  value: string;
  disabled?: boolean;
}

function DatabaseSelectorWidget({
  value,
  onChange,
  className,
  readonly = false,
  disabled = false,
}: DatabaseSelectorWidgetProps) {
  const { databases, databasesError, isDatabasesLoading, mutateDatabases } =
    useDatabases();

  const isDisabled = readonly || disabled;

  const handleSelect = (databaseId: string) => {
    if (!isDisabled) {
      onChange(databaseId);
    }
  };

  if (databasesError) {
    return (
      <div className={cn("p-2 text-center", className)}>
        <div className="text-red-500 text-xs mb-2">
          <Database className="h-4 w-4 mx-auto mb-1" />
          {databasesError.message}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={mutateDatabases}
          className="text-xs h-6"
          disabled={isDatabasesLoading}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("p-2", className)}>
      <Select
        value={value || ""}
        onValueChange={handleSelect}
        disabled={isDisabled || isDatabasesLoading}
      >
        <SelectTrigger className="text-xs h-7">
          <SelectValue
            placeholder={
              isDatabasesLoading ? "Loading..." : "Select database..."
            }
          />
        </SelectTrigger>
        <SelectContent>
          {databases?.map((database) => (
            <SelectItem
              key={database.id}
              value={database.id}
              className="text-xs"
            >
              {database.name}
            </SelectItem>
          ))}
          {databases?.length === 0 && !isDatabasesLoading && (
            <SelectItem disabled value="none" className="text-xs">
              No databases found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export const databaseSelectorWidget = createWidget({
  component: DatabaseSelectorWidget,
  nodeTypes: ["database-query", "database-execute"],
  inputField: "databaseId",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "databaseId", ""),
  }),
});
