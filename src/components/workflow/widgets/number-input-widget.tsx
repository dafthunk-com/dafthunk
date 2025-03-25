import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NumberInputWidgetConfig {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

interface NumberInputWidgetProps {
  config: NumberInputWidgetConfig;
  onChange: (value: number) => void;
  compact?: boolean;
}

export function NumberInputWidget({
  config,
  onChange,
  compact = false,
}: NumberInputWidgetProps) {
  const { value, min, max, step, placeholder } = config;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value === "" ? 0 : Number(e.target.value);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      {!compact && <Label>Number Input</Label>}
      <Input
        type="number"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={compact ? "text-sm" : ""}
      />
    </div>
  );
}
