import { Button } from "@/components/ui/button";
import { Copy, Terminal } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code } from "@/components/ui/code";
import type { Node } from "@xyflow/react";
import type {
  NodeTemplate,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types.tsx";
import { extractDialogParametersFromNodes } from "@/utils/utils";
import { API_BASE_URL } from "@/config/api";

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

  const parameters = extractDialogParametersFromNodes(nodes, nodeTemplates);

  // Check if there's a JSON body parameter
  const jsonBodyParam = parameters.find((p) => p.type === "body.json");
  const formParams = parameters.filter((p) => p.type !== "body.json");

  // Generate curl command based on parameter types
  const generateCurlCommand = () => {
    let curl = `curl -X POST "${executeUrl}"`;

    // Add authorization header (always needed)
    curl += ` \\\n  -H "Authorization: Bearer YOUR_API_KEY"`;

    // Handle JSON body parameter (entire request body is JSON)
    if (jsonBodyParam) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      curl += ` \\\n  -d '{ "key": "value" }'`;
      return curl;
    }

    // Handle form parameters (sent as individual form fields)
    if (formParams.length > 0) {
      // For form parameters, we use multiple -d flags with key=value notation
      formParams.forEach((param) => {
        // Add example values based on parameter type
        let exampleValue: string;
        if (param.type.startsWith("parameter.boolean")) {
          exampleValue = "false";
        } else if (param.type.startsWith("parameter.number")) {
          exampleValue = "123";
        } else {
          exampleValue = `value_for_${param.nameForForm}`;
        }

        curl += ` \\\n  -d "${param.nameForForm}=${exampleValue}"`;
      });
      return curl;
    }

    // No parameters, add empty JSON body
    curl += ` \\\n  -H "Content-Type: application/json"`;
    curl += ` \\\n  -d '{}'`;
    return curl;
  };

  // Generate JavaScript code based on parameter types
  const generateJavaScriptCode = () => {
    let js = `const response = await fetch("${executeUrl}", {\n`;
    js += `  method: "POST",\n`;
    js += `  headers: {\n`;
    js += `    "Authorization": "Bearer YOUR_API_KEY",\n`;

    // Handle JSON body parameter
    if (jsonBodyParam) {
      js += `    "Content-Type": "application/json"\n`;
      js += `  },\n`;
      js += `  body: JSON.stringify({ key: "value" })\n`;
    } else if (formParams.length > 0) {
      // Handle form parameters
      js += `    "Content-Type": "application/x-www-form-urlencoded"\n`;
      js += `  },\n`;
      js += `  body: new URLSearchParams({\n`;
      formParams.forEach((param) => {
        let exampleValue: string;
        if (param.type.startsWith("parameter.boolean")) {
          exampleValue = "false";
        } else if (param.type.startsWith("parameter.number")) {
          exampleValue = "123";
        } else {
          exampleValue = `value_for_${param.nameForForm}`;
        }
        js += `    "${param.nameForForm}": "${exampleValue}",\n`;
      });
      js += `  })\n`;
    } else {
      // No parameters
      js += `    "Content-Type": "application/json"\n`;
      js += `  },\n`;
      js += `  body: JSON.stringify({})\n`;
    }
    js += `});\n\n`;
    js += `const data = await response.json();\n`;
    js += `console.log(data);`;
    return js;
  };

  // Generate Python code based on parameter types
  const generatePythonCode = () => {
    let py = `import requests\n\n`;
    py += `url = "${executeUrl}"\n`;
    py += `headers = {\n`;
    py += `    "Authorization": "Bearer YOUR_API_KEY"\n`;

    // Handle JSON body parameter
    if (jsonBodyParam) {
      py += `}\n`;
      py += `data = {"key": "value"}\n`;
      py += `response = requests.post(url, headers=headers, json=data)\n`;
    } else if (formParams.length > 0) {
      // Handle form parameters
      py += `}\n`;
      py += `data = {\n`;
      formParams.forEach((param) => {
        let exampleValue: string;
        if (param.type.startsWith("parameter.boolean")) {
          exampleValue = "False";
        } else if (param.type.startsWith("parameter.number")) {
          exampleValue = "123";
        } else {
          exampleValue = `value_for_${param.nameForForm}`;
        }
        py += `    "${param.nameForForm}": "${exampleValue}",\n`;
      });
      py += `}\n`;
      py += `response = requests.post(url, headers=headers, data=data)\n`;
    } else {
      // No parameters
      py += `}\n`;
      py += `data = {}\n`;
      py += `response = requests.post(url, headers=headers, json=data)\n`;
    }
    py += `\nprint(response.json())`;
    return py;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          API Integration
        </CardTitle>
        <CardDescription>
          Execute this deployment programmatically using an API key
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                {generateCurlCommand()}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() => handleCopy(generateCurlCommand())}
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
                {generateJavaScriptCode()}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() => handleCopy(generateJavaScriptCode())}
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
                {generatePythonCode()}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() => handleCopy(generatePythonCode())}
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>

          <div className="mt-4">
            <p className="text-sm text-muted-foreground font-medium">Notes:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1 text-muted-foreground">
              <li>
                Replace <code className="text-xs font-mono">YOUR_API_KEY</code>{" "}
                with an API key from your account settings.
              </li>
              {jsonBodyParam && (
                <li>
                  This endpoint expects a complete JSON object in the request
                  body.
                </li>
              )}
              {formParams.length > 0 && (
                <li>
                  This endpoint accepts the following form parameters:{" "}
                  {formParams.map((p) => p.nameForForm).join(", ")}.
                </li>
              )}
              {parameters.length === 0 && (
                <li>This endpoint doesn't require any parameters.</li>
              )}
            </ul>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
