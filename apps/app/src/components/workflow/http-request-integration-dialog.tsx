import type { Node } from "@xyflow/react";

import {
  EXECUTE_WORKFLOW_SNIPPETS,
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
import { extractDialogParametersFromNodes } from "@/utils/utils";

interface HttpRequestIntegrationDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  nodes: Node<WorkflowNodeType>[];
  nodeTypes: NodeType[];
  orgHandle: string;
  workflowId: string;
  deploymentVersion: string;
}

export function HttpRequestIntegrationDialog({
  isOpen,
  onClose,
  nodes,
  nodeTypes,
  orgHandle,
  workflowId,
  deploymentVersion,
}: HttpRequestIntegrationDialogProps) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const executeUrl = `${baseUrl}/${orgHandle}/workflows/${workflowId}/execute/${deploymentVersion}`;

  const parameters = extractDialogParametersFromNodes(nodes, nodeTypes);
  const jsonBodyParam = parameters.find((p) => p.type === "body-json");
  const formParams: SnippetParams[] = parameters
    .filter((p) => p.type !== "body-json")
    .map((p) => ({ nameForForm: p.nameForForm, type: p.type }));

  const renderSnippets = (language: "curl" | "javascript" | "python") => {
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
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DialogTitle className="text-base font-semibold">
            HTTP Request Integration
          </DialogTitle>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="mt-3">
              <CodeBlock language="bash" className="text-sm overflow-x-auto">
                {renderSnippets("curl")}
              </CodeBlock>
            </TabsContent>

            <TabsContent value="javascript" className="mt-3">
              <CodeBlock
                language="javascript"
                className="text-sm overflow-x-auto"
              >
                {renderSnippets("javascript")}
              </CodeBlock>
            </TabsContent>

            <TabsContent value="python" className="mt-3">
              <CodeBlock language="python" className="text-sm overflow-x-auto">
                {renderSnippets("python")}
              </CodeBlock>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Notes:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>
                Replace <code className="font-mono">YOUR_API_KEY</code> with an
                API key from your account settings.
              </li>
              <li>
                This endpoint executes synchronously and returns the response
                defined by the HTTP Response node.
              </li>
              <li>
                If the workflow takes longer than 10 seconds, it will return a
                504 Gateway Timeout error.
              </li>
              {jsonBodyParam && (
                <li>
                  This endpoint expects a complete JSON object in the request
                  body.
                </li>
              )}
              {formParams.length > 0 && !jsonBodyParam && (
                <li>
                  This endpoint accepts form parameters:{" "}
                  {formParams.map((p) => p.nameForForm).join(", ")}.
                </li>
              )}
              {parameters.length === 0 && (
                <li>
                  This endpoint doesn&apos;t require any parameters beyond the
                  API key.
                </li>
              )}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
