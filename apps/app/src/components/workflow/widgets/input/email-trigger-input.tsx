import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmails } from "@/services/email-service";
import { cn } from "@/utils/utils";
import { updateNodeInput, useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";
import { EmailCreateDialog } from "./email-create-dialog";

const CREATE_NEW_SENTINEL = "__create_new__";

interface EmailTriggerInputProps extends BaseWidgetProps {
  nodeId: string;
  emailId: string;
  inputs: WorkflowParameter[];
}

function EmailTriggerInputWidget({
  nodeId,
  emailId,
  inputs,
  className,
  disabled = false,
}: EmailTriggerInputProps) {
  const { emails, isEmailsLoading, mutateEmails } = useEmails();
  const { updateNodeData, edges, deleteEdge } = useWorkflow();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleEmailChange = (value: string) => {
    if (value === CREATE_NEW_SENTINEL) {
      setIsCreateDialogOpen(true);
      return;
    }
    updateNodeInput(
      nodeId,
      "emailId",
      value,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
  };

  const handleEmailCreated = async (newEmailId: string) => {
    await mutateEmails();
    updateNodeInput(
      nodeId,
      "emailId",
      newEmailId,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
    setIsCreateDialogOpen(false);
  };

  return (
    <div className={cn("p-2", className)}>
      <Select
        value={emailId || ""}
        onValueChange={handleEmailChange}
        disabled={disabled || isEmailsLoading}
      >
        <SelectTrigger className="h-6 text-xs">
          <SelectValue
            placeholder={isEmailsLoading ? "Loading..." : "Select an inbox"}
          />
        </SelectTrigger>
        <SelectContent>
          {emails.map((email) => (
            <SelectItem key={email.id} value={email.id}>
              {email.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_NEW_SENTINEL}>+ New Inbox</SelectItem>
        </SelectContent>
      </Select>
      <EmailCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={handleEmailCreated}
      />
    </div>
  );
}

export const emailTriggerInputWidget = createWidget({
  component: EmailTriggerInputWidget,
  nodeTypes: ["receive-email"],
  inputField: "emailId",
  managedFields: [],
  extractConfig: (nodeId, inputs) => ({
    nodeId,
    emailId: getInputValue(inputs, "emailId", ""),
    inputs,
  }),
});
