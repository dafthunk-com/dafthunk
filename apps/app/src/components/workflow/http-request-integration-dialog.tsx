import type { Node } from "@xyflow/react";
import Terminal from "lucide-react/icons/terminal";

import {
  EXECUTE_WORKFLOW_SNIPPETS,
  type SnippetParams,
} from "@/components/deployments/api-snippets";
import { CodeBlock } from "@/components/docs/code-block";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  // Check if there\'s a JSON body parameter
  const jsonBodyParam = parameters.find((p) => p.type === "body-json");
  const formParams: SnippetParams[] = parameters
    .filter((p) => p.type !== "body-json")
    .map((p) => ({ nameForForm: p.nameForForm, type: p.type })); // Adapt to SnippetParams

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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            HTTP Request Integration
          </DialogTitle>
          <DialogDescription>
            Execute this workflow as a REST API endpoint. Returns the response
            defined by the HTTP Response node.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          defaultValue="execute"
          className="w-full flex items-stretch border rounded-lg"
          orientation="vertical"
        >
          <TabsList className="flex flex-col justify-start h-auto gap-1 p-4 rounded-r-none *:w-full *:justify-start *:pe-10">
            <TabsTrigger value="execute">
              <span className="text-xs font-mono me-2 text-green-600 dark:text-green-400">
                POST
              </span>{" "}
              Execute Workflow
            </TabsTrigger>
          </TabsList>

          {/* Execute Workflow Operation */}
          <TabsContent value="execute" className="mt-0 p-4">
            <Tabs defaultValue="curl">
              <TabsList>
                <TabsTrigger value="curl" className="text-sm">
                  cURL
                </TabsTrigger>
                <TabsTrigger value="javascript" className="text-sm">
                  JavaScript
                </TabsTrigger>
                <TabsTrigger value="python" className="text-sm">
                  Python
                </TabsTrigger>
              </TabsList>
              <TabsContent value="curl" className="mt-4 space-y-4">
                <div className="relative">
                  <CodeBlock
                    language="bash"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("curl")}
                  </CodeBlock>
                </div>
              </TabsContent>
              <TabsContent value="javascript" className="mt-4 space-y-4">
                <div className="relative">
                  <CodeBlock
                    language="javascript"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("javascript")}
                  </CodeBlock>
                </div>
              </TabsContent>
              <TabsContent value="python" className="mt-4 space-y-4">
                <div className="relative">
                  <CodeBlock
                    language="python"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("python")}
                  </CodeBlock>
                </div>
              </TabsContent>
            </Tabs>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground font-medium">
                Notes:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-muted-foreground text-xs">
                <li>
                  Replace{" "}
                  <code className="text-xs font-mono">YOUR_API_KEY</code> with
                  an API key from your account settings.
                </li>
                <li>
                  This endpoint executes synchronously and returns the response
                  defined by the HTTP Response node in your workflow.
                </li>
                <li>
                  The response status code and content type are controlled by
                  the HTTP Response node configuration.
                </li>
                <li>
                  If the workflow takes longer than 10 seconds, the endpoint
                  will return a 504 Gateway Timeout error.
                </li>
                {jsonBodyParam && (
                  <li>
                    This endpoint expects a complete JSON object in the request
                    body.
                  </li>
                )}
                {formParams.length > 0 && !jsonBodyParam && (
                  <li>
                    This endpoint accepts the following form parameters:{" "}
                    {formParams.map((p) => p.nameForForm).join(", ")}.
                  </li>
                )}
                {parameters.length === 0 && (
                  <li>
                    This endpoint doesn\'t require any parameters beyond the API
                    key.
                  </li>
                )}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
