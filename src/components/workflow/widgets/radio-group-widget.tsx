import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupWidgetProps {
  config: {
    value: string;
    options: RadioOption[];
  };
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
}

export function RadioGroupWidget({
  config,
  onChange,
  className,
  compact = false,
}: RadioGroupWidgetProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <RadioGroup
        value={config.value}
        onValueChange={onChange}
        className={cn("flex flex-col gap-2", compact && "gap-1")}
      >
        {config.options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={option.value} />
            <Label htmlFor={option.value}>{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
