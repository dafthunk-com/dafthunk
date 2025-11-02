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
  value,
  onChange,
  onClear,
  disabled,
  clearable,
  className,
  active,
  connected,
}: FieldProps) {
  const { secrets, isSecretsLoading } = useSecrets();
  const stringValue = String(value ?? "");
  const hasValue = value !== undefined && value !== "";

  return (
    <div className={cn("relative", className)}>
      <Select
        value={stringValue}
        onValueChange={(val) => onChange(val || undefined)}
        disabled={disabled || isSecretsLoading}
      >
        <SelectTrigger
          className={cn(
            "text-xs rounded-md",
            active
              ? "border-blue-500"
              : "border-neutral-300 dark:border-neutral-700"
          )}
        >
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isSecretsLoading
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
