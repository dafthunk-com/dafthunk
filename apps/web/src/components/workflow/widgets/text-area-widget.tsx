import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";

interface TextAreaWidgetConfig {
  value: string;
  placeholder?: string;
  rows?: number;
}

interface TextAreaWidgetProps {
  config: TextAreaWidgetConfig;
  onChange: (value: string) => void;
  compact?: boolean;
}

export function TextAreaWidget({
  config,
  onChange,
  compact = false,
}: TextAreaWidgetProps) {
  const { value, placeholder, rows = 4 } = config;

  return (
    <div className="space-y-2">
      {!compact && <Label>Text Area</Label>}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn("min-h-[80px] resize-y", compact ? "text-sm" : "")}
      />
    </div>
  );
}
