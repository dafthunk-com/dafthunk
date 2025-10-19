import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";

export interface NumberInputWidgetConfig {
  type: "number-input";
  id: string;
  name: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface NumberInputWidgetProps {
  config: NumberInputWidgetConfig;
  onChange: (value: number) => void;
  className?: string;
  compact?: boolean;
  readonly?: boolean;
}

export function NumberInputWidget({
  config,
  onChange,
  className,
  compact = false,
  readonly = false,
}: NumberInputWidgetProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readonly) return;

    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onChange(value);
    }
  };

  return (
    <div className={cn("space-y-2 p-2", className)}>
      {!compact && <Label>Number Input</Label>}
      <Input
        type="number"
        value={config.value || ""}
        onChange={handleChange}
        min={config.min}
        max={config.max}
        step={config.step}
        placeholder={config.placeholder || "Enter number..."}
        className={cn(compact && "h-8 text-sm")}
        disabled={readonly}
      />
    </div>
  );
}
