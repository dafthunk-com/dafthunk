import type { WorkflowTrigger } from "@dafthunk/types";
import type { Node as ReactFlowNode } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { EmailTriggerDialog } from "./email-trigger-dialog";
import type { EmailData } from "./execution-email-dialog";
import { ExecutionEmailDialog } from "./execution-email-dialog";
import type { HttpRequestConfig } from "./http-request-config-dialog";
import { HttpRequestConfigDialog } from "./http-request-config-dialog";
import { HttpRequestIntegrationDialog } from "./http-request-integration-dialog";
import { HttpWebhookIntegrationDialog } from "./http-webhook-integration-dialog";
import type { NodeType, WorkflowNodeType } from "./workflow-types";

interface WorkflowDialogsProps {
  workflowId: string;
  workflowTrigger?: WorkflowTrigger;
  orgHandle: string;
  nodes: ReactFlowNode<WorkflowNodeType>[];
  nodeTypes: NodeType[];
  // Trigger integration dialogs
  isHttpIntegrationDialogOpen: boolean;
  onCloseHttpIntegration: () => void;
  isEmailTriggerDialogOpen: boolean;
  onCloseEmailTrigger: () => void;
  // Execution form dialogs
  isEmailFormDialogVisible: boolean;
  isHttpRequestConfigDialogVisible: boolean;
  submitHttpRequestConfig: (data: HttpRequestConfig) => void;
  submitEmailFormData: (data: EmailData) => void;
  closeExecutionForm: () => void;
  executeRef: React.RefObject<((triggerData?: unknown) => void) | null>;
  // Error dialog
  errorDialogOpen: boolean;
  setErrorDialogOpen: (open: boolean) => void;
}

export function WorkflowDialogs({
  workflowId,
  workflowTrigger,
  orgHandle,
  nodes,
  nodeTypes,
  isHttpIntegrationDialogOpen,
  onCloseHttpIntegration,
  isEmailTriggerDialogOpen,
  onCloseEmailTrigger,
  isEmailFormDialogVisible,
  isHttpRequestConfigDialogVisible,
  submitHttpRequestConfig,
  submitEmailFormData,
  closeExecutionForm,
  executeRef,
  errorDialogOpen,
  setErrorDialogOpen,
}: WorkflowDialogsProps) {
  return (
    <>
      {workflowTrigger === "http_webhook" && (
        <HttpWebhookIntegrationDialog
          isOpen={isHttpIntegrationDialogOpen}
          onClose={onCloseHttpIntegration}
          orgHandle={orgHandle}
          workflowId={workflowId}
          deploymentVersion="dev"
          nodes={nodes}
          nodeTypes={nodeTypes}
        />
      )}

      {workflowTrigger === "http_request" && (
        <HttpRequestIntegrationDialog
          isOpen={isHttpIntegrationDialogOpen}
          onClose={onCloseHttpIntegration}
          orgHandle={orgHandle}
          workflowId={workflowId}
          deploymentVersion="dev"
          nodes={nodes}
          nodeTypes={nodeTypes}
        />
      )}

      {workflowTrigger === "email_message" && (
        <EmailTriggerDialog
          isOpen={isEmailTriggerDialogOpen}
          onClose={onCloseEmailTrigger}
          workflowId={workflowId}
        />
      )}

      {(workflowTrigger === "http_webhook" ||
        workflowTrigger === "http_request") && (
        <HttpRequestConfigDialog
          isOpen={isHttpRequestConfigDialogVisible}
          onClose={closeExecutionForm}
          onSubmit={submitHttpRequestConfig}
        />
      )}

      {workflowTrigger === "email_message" && (
        <ExecutionEmailDialog
          isOpen={isEmailFormDialogVisible}
          onClose={closeExecutionForm}
          onCancel={() => {
            closeExecutionForm();
            executeRef.current = null;
          }}
          onSubmit={submitEmailFormData}
        />
      )}

      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workflow Execution Error</DialogTitle>
            <DialogDescription>
              You have run out of compute credits. Thanks for checking out the
              preview. The code is available at
              https://github.com/dafthunk-com/dafthunk.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
