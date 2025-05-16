import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

interface TextAreaWidgetProps {
  config: {
    value: string;
    placeholder?: string;
  };
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
  readonly?: boolean;
}

export function TextAreaWidget({
  config,
  onChange,
  className,
  compact = false,
  readonly = false,
}: TextAreaWidgetProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!readonly) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {!compact && <Label>Text Area</Label>}
      <Textarea
        value={config.value || ""}
        onChange={handleChange}
        placeholder={config.placeholder || "Enter text..."}
        className={cn(compact && "min-h-[80px] resize-y")}
        disabled={readonly}
      />
    </div>
  );
}
