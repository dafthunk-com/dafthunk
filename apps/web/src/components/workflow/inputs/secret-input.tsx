import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSecrets } from "@/services/secrets-service";
import { cn } from "@/utils/utils";

import type { InputWidgetProps } from "./types";

export function SecretInputWidget({
  input,
  value,
  onChange,
  readonly,
  className,
  active,
}: InputWidgetProps) {
  const { secrets, isSecretsLoading } = useSecrets();

  return (
    <Select
      value={value !== undefined ? String(value) : ""}
      onValueChange={(val) => onChange(val || undefined)}
      disabled={readonly || isSecretsLoading}
    >
      <SelectTrigger
        className={cn(
          "text-xs rounded-md",
          active && "border border-blue-500",
          className
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
  );
}
