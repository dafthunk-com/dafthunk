import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDatabases } from "@/services/database-service";
import { cn } from "@/utils/utils";

import type { FieldProps } from "./types";

export function DatabaseField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { databases, isDatabasesLoading } = useDatabases();

  const stringValue = String(value ?? "");

  if (disabled) {
    const label = databases?.find((d) => d.id === stringValue)?.name ?? "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No database"}
            />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Select
        value={stringValue}
        onValueChange={(val) => onChange(val || undefined)}
        disabled={isDatabasesLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isDatabasesLoading
                  ? "Loading..."
                  : databases?.length === 0
                    ? "No databases"
                    : "Select database"
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
        </SelectContent>
      </Select>
    </div>
  );
}
