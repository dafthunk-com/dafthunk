import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWhatsAppAccounts } from "@/services/whatsapp-account-service";
import { cn } from "@/utils/utils";
import { updateNodeInput, useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";
import { WhatsAppAccountCreateDialog } from "./whatsapp-account-create-dialog";

const CREATE_NEW_SENTINEL = "__create_new__";

interface WhatsAppTriggerInputProps extends BaseWidgetProps {
  nodeId: string;
  whatsappAccountId: string;
  phoneNumberId: string;
  inputs: WorkflowParameter[];
}

function WhatsAppTriggerInputWidget({
  nodeId,
  whatsappAccountId,
  inputs,
  className,
  disabled = false,
}: WhatsAppTriggerInputProps) {
  const {
    whatsappAccounts,
    isWhatsAppAccountsLoading,
    mutateWhatsAppAccounts,
  } = useWhatsAppAccounts();
  const { updateNodeData, edges, deleteEdge } = useWorkflow();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleAccountChange = (value: string) => {
    if (value === CREATE_NEW_SENTINEL) {
      setIsCreateDialogOpen(true);
      return;
    }
    updateNodeInput(
      nodeId,
      "whatsappAccountId",
      value,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
  };

  const handleAccountCreated = async (accountId: string) => {
    await mutateWhatsAppAccounts?.();
    updateNodeInput(
      nodeId,
      "whatsappAccountId",
      accountId,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
    setIsCreateDialogOpen(false);
  };

  return (
    <div className={cn("p-2 space-y-1", className)}>
      <Select
        value={whatsappAccountId || ""}
        onValueChange={handleAccountChange}
        disabled={disabled || isWhatsAppAccountsLoading}
      >
        <SelectTrigger className="h-6 text-xs">
          <SelectValue
            placeholder={
              isWhatsAppAccountsLoading ? "Loading..." : "Select an account"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {whatsappAccounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_NEW_SENTINEL}>+ New Account</SelectItem>
        </SelectContent>
      </Select>
      <WhatsAppAccountCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={handleAccountCreated}
      />
    </div>
  );
}

export const whatsappTriggerInputWidget = createWidget({
  component: WhatsAppTriggerInputWidget,
  nodeTypes: ["receive-whatsapp-message"],
  inputField: "whatsappAccountId",
  managedFields: ["phoneNumberId"],
  extractConfig: (nodeId, inputs) => ({
    nodeId,
    whatsappAccountId: getInputValue(inputs, "whatsappAccountId", ""),
    phoneNumberId: getInputValue(inputs, "phoneNumberId", ""),
    inputs,
  }),
});
