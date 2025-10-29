import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSecrets } from "@/services/secrets-service";

import type { InputWidgetProps } from "./types";

export function SecretInputWidget({
  value,
  onChange,
  readonly,
}: InputWidgetProps) {
  const { secrets, isSecretsLoading } = useSecrets();

  return (
    <Select
      value={value !== undefined ? String(value) : ""}
      onValueChange={onChange}
      disabled={readonly || isSecretsLoading}
    >
      <SelectTrigger className="h-8 text-xs">
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
