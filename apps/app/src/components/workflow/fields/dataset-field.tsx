import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDatasets } from "@/services/dataset-service";
import { cn } from "@/utils/utils";

import type { FieldProps } from "./types";

export function DatasetField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { datasets, isDatasetsLoading } = useDatasets();

  const stringValue = String(value ?? "");

  if (disabled) {
    const label = datasets?.find((d) => d.id === stringValue)?.name ?? "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No dataset"}
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
        disabled={isDatasetsLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isDatasetsLoading
                  ? "Loading..."
                  : datasets?.length === 0
                    ? "No datasets"
                    : "Select dataset"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {datasets?.map((dataset) => (
            <SelectItem key={dataset.id} value={dataset.id} className="text-xs">
              {dataset.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
