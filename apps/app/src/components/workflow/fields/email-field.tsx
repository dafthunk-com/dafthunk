import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmailCreateDialog } from "@/components/workflow/widgets/input/email-create-dialog";
import { useEmails } from "@/services/email-service";
import { cn } from "@/utils/utils";

import type { FieldProps } from "./types";

const CREATE_NEW = "__create_new__";

export function EmailField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { emails, isEmailsLoading, mutateEmails } = useEmails();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const stringValue = String(value ?? "");

  const handleChange = (val: string) => {
    if (val === CREATE_NEW) {
      setIsCreateDialogOpen(true);
      return;
    }
    onChange(val || undefined);
  };

  const handleCreated = (emailId: string) => {
    mutateEmails();
    onChange(emailId);
    setIsCreateDialogOpen(false);
  };

  if (disabled) {
    const label = emails?.find((e) => e.id === stringValue)?.name ?? "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No email"}
            >
              {connected ? "Connected" : label || "No email"}
            </SelectValue>
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Select
        value={stringValue}
        onValueChange={handleChange}
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
                    ? "No emails"
                    : "Select email"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {emails?.map((email) => (
            <SelectItem key={email.id} value={email.id} className="text-xs">
              {email.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_NEW} className="text-xs">
            + New Email
          </SelectItem>
        </SelectContent>
      </Select>

      <EmailCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
