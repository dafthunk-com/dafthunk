import type { Node } from "@xyflow/react";

import {
  EXECUTE_WORKFLOW_SNIPPETS,
  GET_EXECUTION_STATUS_SNIPPETS,
  GET_OBJECT_SNIPPETS,
  type SnippetParams,
} from "@/components/deployments/api-snippets";
import { CodeBlock } from "@/components/docs/code-block";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  NodeType,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";
import { getApiBaseUrl } from "@/config/api";
import { cn, extractDialogParametersFromNodes } from "@/utils/utils";

interface HttpWebhookIntegrationDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  nodes: Node<WorkflowNodeType>[];
  nodeTypes: NodeType[];
  orgHandle: string;
  workflowId: string;
  deploymentVersion: string;
}

type Operation = "execute" | "status" | "getObject";

function OperationButton({
  label,
  method,
  isActive,
  onClick,
}: {
  label: string;
  method: "POST" | "GET";
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors text-left",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "text-xs font-mono",
          method === "POST"
            ? "text-green-600 dark:text-green-400"
            : "text-blue-600 dark:text-blue-400"
        )}
      >
        {method}
      </span>
      {label}
    </button>
  );
}

export function HttpWebhookIntegrationDialog({
  isOpen,
  onClose,
  nodes,
  nodeTypes,
  orgHandle,
  workflowId,
  deploymentVersion,
}: HttpWebhookIntegrationDialogProps) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const executeUrl = `${baseUrl}/${orgHandle}/workflows/${workflowId}/execute/${deploymentVersion}`;
  const statusBaseUrl = `${baseUrl}/${orgHandle}/executions`;
  const objectBaseUrl = `${baseUrl}/${orgHandle}/objects?id=YOUR_OBJECT_ID`;

  const parameters = extractDialogParametersFromNodes(nodes, nodeTypes);
  const jsonBodyParam = parameters.find((p) => p.type === "body-json");
  const formParams: SnippetParams[] = parameters
    .filter((p) => p.type !== "body-json")
    .map((p) => ({ nameForForm: p.nameForForm, type: p.type }));

  const renderSnippets = (
    operation: Operation,
    language: "curl" | "javascript" | "python"
  ) => {
    if (operation === "execute") {
      switch (language) {
        case "curl":
          return EXECUTE_WORKFLOW_SNIPPETS.curl(
            executeUrl,
            !!jsonBodyParam,
            formParams
          );
        case "javascript":
          return EXECUTE_WORKFLOW_SNIPPETS.javascript(
            executeUrl,
            !!jsonBodyParam,
            formParams
          );
        case "python":
          return EXECUTE_WORKFLOW_SNIPPETS.python(
            executeUrl,
            !!jsonBodyParam,
            formParams
          );
      }
    }
    if (operation === "status") {
      switch (language) {
        case "curl":
          return GET_EXECUTION_STATUS_SNIPPETS.curl(statusBaseUrl);
        case "javascript":
          return GET_EXECUTION_STATUS_SNIPPETS.javascript(statusBaseUrl);
        case "python":
          return GET_EXECUTION_STATUS_SNIPPETS.python(statusBaseUrl);
      }
    }
    if (operation === "getObject") {
      switch (language) {
        case "curl":
          return GET_OBJECT_SNIPPETS.curl(objectBaseUrl);
        case "javascript":
          return GET_OBJECT_SNIPPETS.javascript(objectBaseUrl);
        case "python":
          return GET_OBJECT_SNIPPETS.python(objectBaseUrl);
      }
    }
    return "";
  };

  const getNotes = (operation: Operation) => {
    const baseNotes = [
      <>
        Replace <code className="font-mono">YOUR_API_KEY</code> with an API key
        from your account settings.
      </>,
    ];

    if (operation === "execute") {
      const notes = [
        ...baseNotes,
        "Returns immediately with an execution ID. Use the Status endpoint to poll for results.",
      ];
      if (jsonBodyParam) {
        notes.push("Expects a complete JSON object in the request body.");
      }
      if (formParams.length > 0 && !jsonBodyParam) {
        notes.push(
          `Accepts form parameters: ${formParams.map((p) => p.nameForForm).join(", ")}.`
        );
      }
      if (parameters.length === 0) {
        notes.push("No parameters required beyond the API key.");
      }
      return notes;
    }

    if (operation === "status") {
      return [
        ...baseNotes,
        <>
          Replace <code className="font-mono">YOUR_EXECUTION_ID</code> with the
          execution ID.
        </>,
        "Poll this endpoint to check status and retrieve results.",
      ];
    }

    if (operation === "getObject") {
      return [
        ...baseNotes,
        <>
          Replace <code className="font-mono">YOUR_OBJECT_ID</code> and{" "}
          <code className="font-mono">YOUR_OBJECT_MIME_TYPE</code> with actual
          values.
        </>,
        "Returns raw object data. Processing depends on the MIME type.",
      ];
    }

    return baseNotes;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DialogTitle className="text-base font-semibold">
            HTTP Webhook Integration
          </DialogTitle>
        </div>

        <Tabs
          defaultValue="execute"
          className="flex-1 flex overflow-hidden"
          orientation="vertical"
        >
          <div className="flex flex-col gap-1 p-3 border-r bg-muted/30">
            <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1">
              <TabsTrigger value="execute" asChild>
                <OperationButton
                  label="Execute"
                  method="POST"
                  isActive={false}
                  onClick={() => {}}
                />
              </TabsTrigger>
              <TabsTrigger value="status" asChild>
                <OperationButton
                  label="Status"
                  method="GET"
                  isActive={false}
                  onClick={() => {}}
                />
              </TabsTrigger>
              <TabsTrigger value="getObject" asChild>
                <OperationButton
                  label="Object"
                  method="GET"
                  isActive={false}
                  onClick={() => {}}
                />
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {(["execute", "status", "getObject"] as Operation[]).map((op) => (
              <TabsContent key={op} value={op} className="mt-0">
                <Tabs defaultValue="curl">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>

                  {(["curl", "javascript", "python"] as const).map((lang) => (
                    <TabsContent key={lang} value={lang} className="mt-3">
                      <CodeBlock
                        language={lang === "curl" ? "bash" : lang}
                        className="text-sm overflow-x-auto"
                      >
                        {renderSnippets(op, lang)}
                      </CodeBlock>
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="mt-4 text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Notes:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {getNotes(op).map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
