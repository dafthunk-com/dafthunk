import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InputTextWidgetConfig {
  value: string;
  placeholder?: string;
}

interface InputTextWidgetProps {
  config: InputTextWidgetConfig;
  onChange: (value: string) => void;
  compact?: boolean;
}

export function InputTextWidget({
  config,
  onChange,
  compact = false,
}: InputTextWidgetProps) {
  const { value, placeholder } = config;

  return (
    <div className="space-y-2">
      {!compact && <Label>Text Input</Label>}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={compact ? "text-sm" : ""}
      />
    </div>
  );
}
