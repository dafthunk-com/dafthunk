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
import type { FieldProps } from "./types";

export function SecretField({
  input: _input,
  value,
  onChange,
  onClear,
  disabled,
  clearable,
  className,
  active,
  connected,
  editable = true,
}: FieldProps) {
  const { secrets, isSecretsLoading } = useSecrets();
  const hasValue = value !== undefined && value !== "";

  // Non-editable or disabled state without value
  if ((!editable || disabled) && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No value"}
      </div>
    );
  }

  // Non-editable state with value
  if (!editable) {
    return (
      <div
        className={cn(
          "text-xs p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {String(value)}
      </div>
    );
  }

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
            disabled && "bg-muted/50 border-border",
            !disabled && active && "border border-blue-500",
            !disabled &&
              !active &&
              "border border-neutral-300 dark:border-neutral-700"
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
      {!disabled && clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear secret"
          className="absolute top-2 right-8"
        />
      )}
    </div>
  );
}
