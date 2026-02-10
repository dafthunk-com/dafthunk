import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmails } from "@/services/email-service";
import { cn } from "@/utils/utils";

import type { FieldProps } from "./types";

export function EmailField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { emails, isEmailsLoading } = useEmails();

  const stringValue = String(value ?? "");

  if (disabled) {
    const label = emails?.find((e) => e.id === stringValue)?.name ?? "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No email inbox"}
            />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Select
        value={stringValue}
        onValueChange={(val) => onChange(val || undefined)}
        disabled={isEmailsLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isEmailsLoading
                  ? "Loading..."
                  : emails?.length === 0
                    ? "No email inboxes"
                    : "Select email inbox"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {emails?.map((email) => (
            <SelectItem key={email.id} value={email.id} className="text-xs">
              {email.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
