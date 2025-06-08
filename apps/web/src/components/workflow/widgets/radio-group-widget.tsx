import { useState } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/utils/utils";

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
  const [value, setValue] = useState(config.value);

  return (
    <div className={cn("space-y-2 p-2", className)}>
      <RadioGroup
        value={value}
        onValueChange={(value) => {
          setValue(value);
          onChange(value);
        }}
        className={cn("flex flex-col gap-2", compact && "gap-1")}
      >
        {config.options.map((option, i) => (
          <div key={i} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={option.value} />
            <Label htmlFor={option.value} className="text-xs">{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
