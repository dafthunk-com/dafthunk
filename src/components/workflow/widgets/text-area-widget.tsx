import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TextAreaWidgetConfig {
  value: string;
  placeholder?: string;
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
  const { value, placeholder } = config;

  return (
    <div className="space-y-2">
      {!compact && <Label>Text Area</Label>}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className={compact ? "text-sm" : ""}
      />
    </div>
  );
}
