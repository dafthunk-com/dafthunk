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
import { useDatasets } from "@/services/dataset-service";
import { cn } from "@/utils/utils";

export interface DatasetSelectorConfig {
  type: "dataset-selector";
  id: string;
  name: string;
  value: string;
}

export interface DatasetSelectorWidgetProps {
  config: DatasetSelectorConfig;
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
  readonly?: boolean;
}

export function DatasetSelectorWidget({
  config,
  onChange,
  className,
  compact = false,
  readonly = false,
}: DatasetSelectorWidgetProps) {
  const { datasets, datasetsError, isDatasetsLoading, mutateDatasets } =
    useDatasets();

  const handleSelect = (datasetId: string) => {
    if (readonly) return;
    onChange(datasetId);
  };

  if (datasetsError) {
    return (
      <div className={cn("p-2 text-center", className)}>
        <div className="text-red-500 text-xs mb-2">
          <Database className="h-4 w-4 mx-auto mb-1" />
          {datasetsError.message}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={mutateDatasets}
          className="text-xs h-6"
          disabled={isDatasetsLoading}
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
        value={config.value || ""}
        onValueChange={handleSelect}
        disabled={readonly || isDatasetsLoading}
      >
        <SelectTrigger className={cn("text-xs", compact ? "h-7" : "h-8")}>
          <SelectValue
            placeholder={isDatasetsLoading ? "Loading..." : "Select dataset..."}
          />
        </SelectTrigger>
        <SelectContent>
          {datasets?.map((dataset) => (
            <SelectItem key={dataset.id} value={dataset.id} className="text-xs">
              {dataset.name}
            </SelectItem>
          ))}
          {datasets?.length === 0 && !isDatasetsLoading && (
            <SelectItem disabled value="" className="text-xs">
              No datasets found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
