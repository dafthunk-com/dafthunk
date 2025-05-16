import type { Node } from "@xyflow/react";
import { Copy, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Code } from "@/components/ui/code";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  NodeTemplate,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";
import { API_BASE_URL } from "@/config/api";
import {
  EXECUTE_WORKFLOW_SNIPPETS,
  GET_EXECUTION_STATUS_SNIPPETS,
  GET_OBJECT_SNIPPETS,
  type SnippetParams,
} from "@/components/deployments/api-snippets";
import { extractDialogParametersFromNodes } from "@/utils/utils";

interface ApiIntegrationCardProps {
  nodes: Node<WorkflowNodeType>[];
  nodeTemplates: NodeTemplate[];
  orgHandle: string;
  workflowId: string;
  deploymentVersion: string;
}

export function ApiIntegrationCard({
  nodes,
  nodeTemplates,
  orgHandle,
  workflowId,
  deploymentVersion,
}: ApiIntegrationCardProps) {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const executeUrl = `${baseUrl}/${orgHandle}/workflows/${workflowId}/execute/${deploymentVersion}`;
  const statusBaseUrl = `${baseUrl}/${orgHandle}/executions`; // Execution ID will be appended in snippets
  const objectBaseUrl = `${baseUrl}/${orgHandle}/objects?id=YOUR_OBJECT_ID`; // Object ID and mimeType to be added

  const parameters = extractDialogParametersFromNodes(nodes, nodeTemplates);

  // Check if there\'s a JSON body parameter
  const jsonBodyParam = parameters.find((p) => p.type === "body.json");
  const formParams: SnippetParams[] = parameters
    .filter((p) => p.type !== "body.json")
    .map((p) => ({ nameForForm: p.nameForForm, type: p.type })); // Adapt to SnippetParams

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Consider adding a toast notification here for better UX
  };

  const renderSnippets = (
    operation: "execute" | "status" | "getObject",
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
        default:
          return "";
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
        default:
          return "";
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
        default:
          return "";
      }
    }
    return "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          API Integration
        </CardTitle>
        <CardDescription>
          Programmatically interact with this workflow deployment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="execute"
          className="w-full flex items-stretch border rounded-lg"
          orientation="vertical"
        >
          <TabsList className="flex flex-col justify-start h-auto gap-1 p-4 rounded-r-none *:w-full *:justify-start *:pe-10">
            <TabsTrigger value="execute">
              <span className="text-xs font-mono me-2 text-green-600">
                POST
              </span>{" "}
              Execute Workflow
            </TabsTrigger>
            <TabsTrigger value="status">
              <span className="text-xs font-mono me-2 text-blue-600">
                GET&nbsp;
              </span>{" "}
              Execution Status
            </TabsTrigger>
            <TabsTrigger value="getObject">
              <span className="text-xs font-mono me-2 text-blue-600">
                GET&nbsp;
              </span>{" "}
              Object
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
                  <Code
                    language="bash"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("execute", "curl")}
                  </Code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={() =>
                      handleCopy(renderSnippets("execute", "curl"))
                    }
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="javascript" className="mt-4 space-y-4">
                <div className="relative">
                  <Code
                    language="javascript"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("execute", "javascript")}
                  </Code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={() =>
                      handleCopy(renderSnippets("execute", "javascript"))
                    }
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="python" className="mt-4 space-y-4">
                <div className="relative">
                  <Code
                    language="python"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("execute", "python")}
                  </Code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={() =>
                      handleCopy(renderSnippets("execute", "python"))
                    }
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground font-medium">
                Notes for Execute Workflow:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-muted-foreground text-xs">
                <li>
                  Replace{" "}
                  <code className="text-xs font-mono">YOUR_API_KEY</code> with
                  an API key from your account settings.
                </li>
                {jsonBodyParam && (
                  <li>
                    This endpoint expects a complete JSON object in the request
                    body for execution.
                  </li>
                )}
                {formParams.length > 0 && !jsonBodyParam && (
                  <li>
                    This endpoint accepts the following form parameters for
                    execution: {formParams.map((p) => p.nameForForm).join(", ")}
                    .
                  </li>
                )}
                {parameters.length === 0 && (
                  <li>
                    This execution endpoint doesn\'t require any parameters
                    beyond the auth token.
                  </li>
                )}
              </ul>
            </div>
          </TabsContent>

          {/* Execution Status Operation */}
          <TabsContent value="status" className="mt-0 p-4">
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
                  <Code
                    language="bash"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("status", "curl")}
                  </Code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={() => handleCopy(renderSnippets("status", "curl"))}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="javascript" className="mt-4 space-y-4">
                <div className="relative">
                  <Code
                    language="javascript"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("status", "javascript")}
                  </Code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={() =>
                      handleCopy(renderSnippets("status", "javascript"))
                    }
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="python" className="mt-4 space-y-4">
                <div className="relative">
                  <Code
                    language="python"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("status", "python")}
                  </Code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={() =>
                      handleCopy(renderSnippets("status", "python"))
                    }
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground font-medium">
                Notes for Execution Status:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-muted-foreground text-xs">
                <li>
                  Replace{" "}
                  <code className="text-xs font-mono">YOUR_API_KEY</code> with
                  an API key.
                </li>
                <li>
                  Replace{" "}
                  <code className="text-xs font-mono">YOUR_EXECUTION_ID</code>{" "}
                  with the actual ID of the execution.
                </li>
                <li>
                  This endpoint is used to poll for the status and result of a
                  workflow execution.
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* Get Object Operation */}
          <TabsContent value="getObject" className="mt-0 p-4">
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
                  <Code
                    language="bash"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("getObject", "curl")}
                  </Code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={() =>
                      handleCopy(renderSnippets("getObject", "curl"))
                    }
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="javascript" className="mt-4 space-y-4">
                <div className="relative">
                  <Code
                    language="javascript"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("getObject", "javascript")}
                  </Code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={() =>
                      handleCopy(renderSnippets("getObject", "javascript"))
                    }
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="python" className="mt-4 space-y-4">
                <div className="relative">
                  <Code
                    language="python"
                    className="text-xs md:text-sm overflow-x-auto font-mono"
                  >
                    {renderSnippets("getObject", "python")}
                  </Code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    onClick={() =>
                      handleCopy(renderSnippets("getObject", "python"))
                    }
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground font-medium">
                Notes for Get Object:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-muted-foreground text-xs">
                <li>
                  Replace{" "}
                  <code className="text-xs font-mono">YOUR_API_KEY</code> with
                  an API key.
                </li>
                <li>
                  Replace{" "}
                  <code className="text-xs font-mono">YOUR_OBJECT_ID</code> in
                  the URL with the actual ID of the object.
                </li>
                <li>
                  Replace{" "}
                  <code className="text-xs font-mono">
                    YOUR_OBJECT_MIME_TYPE
                  </code>{" "}
                  in the URL with the actual MIME type of the object (e.g.,
                  image/png, application/json, text/plain).
                </li>
                <li>
                  This endpoint retrieves the raw object data. How you process
                  the response will depend on the object&apos;s MIME type.
                </li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
