import Mail from "lucide-react/icons/mail";
import RefreshCw from "lucide-react/icons/refresh-cw";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmails } from "@/services/email-service";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface EmailSelectorWidgetProps extends BaseWidgetProps {
  value: string;
  disabled?: boolean;
}

function EmailSelectorWidget({
  value,
  onChange,
  className,
  readonly = false,
  disabled = false,
}: EmailSelectorWidgetProps) {
  const { emails, emailsError, isEmailsLoading, mutateEmails } = useEmails();

  const isDisabled = readonly || disabled;

  const handleSelect = (emailId: string) => {
    if (!isDisabled) {
      onChange(emailId);
    }
  };

  if (emailsError) {
    return (
      <div className={cn("p-2 text-center", className)}>
        <div className="text-red-500 text-xs mb-2">
          <Mail className="h-4 w-4 mx-auto mb-1" />
          {emailsError.message}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={mutateEmails}
          className="text-xs h-6"
          disabled={isEmailsLoading}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("p-2", className)}>
      <Select
        value={value || ""}
        onValueChange={handleSelect}
        disabled={isDisabled || isEmailsLoading}
      >
        <SelectTrigger className="text-xs h-7">
          <SelectValue
            placeholder={isEmailsLoading ? "Loading..." : "Select email inbox..."}
          />
        </SelectTrigger>
        <SelectContent>
          {emails?.map((email) => (
            <SelectItem
              key={email.id}
              value={email.id}
              className="text-xs"
            >
              {email.name}
            </SelectItem>
          ))}
          {emails?.length === 0 && !isEmailsLoading && (
            <SelectItem disabled value="none" className="text-xs">
              No email inboxes found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export const emailSelectorWidget = createWidget({
  component: EmailSelectorWidget,
  nodeTypes: ["receive-email"],
  inputField: "emailId",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "emailId", ""),
  }),
});
