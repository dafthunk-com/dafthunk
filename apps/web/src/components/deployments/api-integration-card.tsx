import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Terminal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code } from "@/components/ui/code";
import type { Node } from "@xyflow/react";
import type { NodeTemplate, WorkflowNodeType } from "@/components/workflow/workflow-types.tsx";
import { extractDialogParametersFromNodes } from "@/utils/utils";
import { API_BASE_URL } from "@/config/api";

interface ApiIntegrationCardProps {
  deploymentId: string;
  nodes: Node<WorkflowNodeType>[];
  nodeTemplates: NodeTemplate[];
}

export function ApiIntegrationCard({
  deploymentId,
  nodes,
  nodeTemplates
}: ApiIntegrationCardProps) {
  const [copied, setCopied] = useState(false);
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const executeUrl = `${baseUrl}/deployments/version/${deploymentId}/execute`;

  const parameters = extractDialogParametersFromNodes(nodes, nodeTemplates);
  
  // Check if there's a JSON body parameter
  const jsonBodyParam = parameters.find(p => p.type === "body.json");
  const formParams = parameters.filter(p => p.type !== "body.json");
  
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
      formParams.forEach(param => {
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
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
            <TabsTrigger value="curl">cURL</TabsTrigger>
          </TabsList>
          <TabsContent value="curl" className="mt-4 space-y-4">
            <div className="relative">
              <Code language="bash" className="text-xs md:text-sm overflow-x-auto">
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
            
            <div className="text-sm">
              <h4 className="font-medium">Notes:</h4>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-muted-foreground">
                <li>Replace <code>YOUR_API_KEY</code> with an API key from your account settings.</li>
                {jsonBodyParam && (
                  <li>This endpoint expects a complete JSON object in the request body.</li>
                )}
                {formParams.length > 0 && (
                  <li>
                    This endpoint accepts the following form parameters: {formParams.map(p => p.nameForForm).join(', ')}.
                  </li>
                )}
                {parameters.length === 0 && (
                  <li>This endpoint doesn't require any parameters.</li>
                )}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 