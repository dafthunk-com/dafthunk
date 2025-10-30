import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSecrets } from "@/services/secrets-service";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { InputWidgetProps } from "./types";

export function SecretInputWidget({
  input: _input,
  value,
  onChange,
  onClear,
  disabled,
  showClearButton,
  className,
  active,
}: InputWidgetProps) {
  const { secrets, isSecretsLoading } = useSecrets();
  const hasValue = value !== undefined && value !== "";

  return (
    <div className={cn("relative", className)}>
      <Select
        value={value !== undefined ? String(value) : ""}
        onValueChange={(val) => onChange(val || undefined)}
        disabled={disabled || isSecretsLoading}
      >
        <SelectTrigger
          className={cn(
            "text-xs rounded-md",
            active && "border border-blue-500"
          )}
        >
          <SelectValue
            placeholder={
              isSecretsLoading
                ? "Loading..."
                : secrets.length === 0
                  ? "No secrets"
                  : "Select secret"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {secrets.map((secret) => (
            <SelectItem key={secret.id} value={secret.name}>
              {secret.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!disabled && showClearButton && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear secret"
          className="absolute top-2 right-8 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        />
      )}
    </div>
  );
}
