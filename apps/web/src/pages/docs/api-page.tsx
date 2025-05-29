import { ArrowRight, Copy } from "lucide-react";
import { Link } from "react-router";

import { CodeBlock } from "@/components/docs/code-block";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/ui/code";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  EXECUTE_WORKFLOW_SNIPPETS,
  GET_EXECUTION_STATUS_SNIPPETS,
  GET_OBJECT_SNIPPETS,
} from "@/components/deployments/api-snippets";

export function DocsApiPage() {
  usePageBreadcrumbs([
    { label: "Documentation", to: "/docs" },
    { label: "API" },
  ]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const BASE_URL = "https://api.dafthunk.com";

  // Example URLs for documentation
  const exampleExecuteUrl = `${BASE_URL}/your-org/workflows/wf_123/execute/v1`;
  const exampleStatusBaseUrl = `${BASE_URL}/your-org/executions`;
  const exampleObjectBaseUrl = `${BASE_URL}/your-org/objects?id=YOUR_OBJECT_ID`;

  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <h2>Base URL</h2>
      <p>All API requests should be made to:</p>
      <CodeBlock>{BASE_URL}</CodeBlock>

      <h2 id="authentication">Authentication</h2>

      <h3>API Key Authentication</h3>
      <p>
        Secure your API requests using API keys generated from your dashboard.
      </p>

      <h4>Getting API Keys</h4>
      <ol>
        <li>
          Navigate to <strong>Settings → API Keys</strong>
        </li>
        <li>
          Click <strong>"Create New API Key"</strong>
        </li>
        <li>Give your key a descriptive name</li>
        <li>Copy and store the key securely</li>
      </ol>

      <h4>Using API Keys</h4>
      <p>Include your API key in the Authorization header of all requests:</p>
      <CodeBlock language="http">
        Authorization: Bearer your_api_key_here
      </CodeBlock>

      <h2 id="workflow-execution">Workflow Execution</h2>

      <h3>Execute Workflow</h3>
      <p>Trigger workflow execution with custom input parameters.</p>
      <p>
        <strong>Endpoint:</strong>{" "}
        <code>
          POST /{"{orgHandle}"}/workflows/{"{workflowId}"}/execute/
          {"{version}"}
        </code>
      </p>
      <p>
        <strong>Description:</strong> Execute a deployed workflow with input
        parameters
      </p>

      <h4>Request Body</h4>
      <p>
        The request body can be any valid JSON that will be passed to the
        workflow. The specific structure depends on your workflow's parameter
        nodes.
      </p>
      <CodeBlock language="json">{`{
  "parameter1": "value1",
  "parameter2": "value2",
  "file_url": "https://example.com/file.pdf"
}`}</CodeBlock>

      <p>
        <strong>Query Parameters:</strong>
      </p>
      <ul>
        <li>
          <code>monitorProgress</code> (optional): Set to <code>true</code> to
          enable real-time progress monitoring
        </li>
      </ul>

      <h4>Response</h4>
      <CodeBlock language="json">{`{
  "id": "exec_1234567890",
  "workflowId": "wf_123",
  "status": "submitted",
  "nodeExecutions": [
    {
      "nodeId": "node_1", 
      "status": "executing"
    }
  ]
}`}</CodeBlock>

      <h4>Code Examples</h4>
      <div className="not-prose">
        <Tabs defaultValue="curl" className="w-full">
          <TabsList>
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
          </TabsList>
          <TabsContent value="curl" className="mt-4">
            <div className="relative">
              <Code language="bash" className="text-sm">
                {EXECUTE_WORKFLOW_SNIPPETS.curl(exampleExecuteUrl, true, [])}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() =>
                  handleCopy(
                    EXECUTE_WORKFLOW_SNIPPETS.curl(exampleExecuteUrl, true, [])
                  )
                }
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="javascript" className="mt-4">
            <div className="relative">
              <Code language="javascript" className="text-sm">
                {EXECUTE_WORKFLOW_SNIPPETS.javascript(
                  exampleExecuteUrl,
                  true,
                  []
                )}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() =>
                  handleCopy(
                    EXECUTE_WORKFLOW_SNIPPETS.javascript(
                      exampleExecuteUrl,
                      true,
                      []
                    )
                  )
                }
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="python" className="mt-4">
            <div className="relative">
              <Code language="python" className="text-sm">
                {EXECUTE_WORKFLOW_SNIPPETS.python(exampleExecuteUrl, true, [])}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() =>
                  handleCopy(
                    EXECUTE_WORKFLOW_SNIPPETS.python(
                      exampleExecuteUrl,
                      true,
                      []
                    )
                  )
                }
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <h2 id="status-results">Workflow Status</h2>

      <h3>Get Execution Status</h3>
      <p>
        Check execution status and retrieve results from completed workflows.
      </p>
      <p>
        <strong>Endpoint:</strong>{" "}
        <code>
          GET /{"{orgHandle}"}/executions/{"{executionId}"}
        </code>
      </p>
      <p>
        <strong>Description:</strong> Retrieve execution status and results
      </p>

      <h4>Response</h4>
      <CodeBlock language="json">{`{
  "execution": {
    "id": "exec_1234567890",
    "workflowId": "wf_123",
    "workflowName": "My Workflow",
    "deploymentId": "deployment_456",
    "status": "completed",
    "nodeExecutions": [
      {
        "nodeId": "node_1",
        "status": "completed",
        "outputs": {
          "result": "Generated result data"
        }
      }
    ],
    "visibility": "private",
    "startedAt": "2024-01-15T10:30:00.000Z",
    "endedAt": "2024-01-15T10:31:23.000Z"
  }
}`}</CodeBlock>

      <h4>Code Examples</h4>
      <div className="not-prose">
        <Tabs defaultValue="curl" className="w-full">
          <TabsList>
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
          </TabsList>
          <TabsContent value="curl" className="mt-4">
            <div className="relative">
              <Code language="bash" className="text-sm">
                {GET_EXECUTION_STATUS_SNIPPETS.curl(exampleStatusBaseUrl)}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() =>
                  handleCopy(
                    GET_EXECUTION_STATUS_SNIPPETS.curl(exampleStatusBaseUrl)
                  )
                }
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="javascript" className="mt-4">
            <div className="relative">
              <Code language="javascript" className="text-sm">
                {GET_EXECUTION_STATUS_SNIPPETS.javascript(exampleStatusBaseUrl)}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() =>
                  handleCopy(
                    GET_EXECUTION_STATUS_SNIPPETS.javascript(
                      exampleStatusBaseUrl
                    )
                  )
                }
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="python" className="mt-4">
            <div className="relative">
              <Code language="python" className="text-sm">
                {GET_EXECUTION_STATUS_SNIPPETS.python(exampleStatusBaseUrl)}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() =>
                  handleCopy(
                    GET_EXECUTION_STATUS_SNIPPETS.python(exampleStatusBaseUrl)
                  )
                }
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <h4>Status Values</h4>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>idle</code>
            </td>
            <td>Execution not yet started</td>
          </tr>
          <tr>
            <td>
              <code>submitted</code>
            </td>
            <td>Execution has been submitted</td>
          </tr>
          <tr>
            <td>
              <code>executing</code>
            </td>
            <td>Currently executing</td>
          </tr>
          <tr>
            <td>
              <code>completed</code>
            </td>
            <td>Successfully finished</td>
          </tr>
          <tr>
            <td>
              <code>error</code>
            </td>
            <td>Execution failed</td>
          </tr>
          <tr>
            <td>
              <code>cancelled</code>
            </td>
            <td>Execution was cancelled</td>
          </tr>
          <tr>
            <td>
              <code>paused</code>
            </td>
            <td>Execution is paused</td>
          </tr>
        </tbody>
      </table>

      <h2 id="object-retrieval">Object Retrieval</h2>

      <h3>Get Object</h3>
      <p>
        Retrieve binary or structured data objects generated by workflow
        executions.
      </p>
      <p>
        <strong>Endpoint:</strong>{" "}
        <code>
          GET /{"{orgHandle}"}/objects?id={"{objectId}"}&mimeType=
          {"{mimeType}"}
        </code>
      </p>
      <p>
        <strong>Description:</strong> Retrieve raw object data with specified
        MIME type
      </p>

      <h4>Query Parameters</h4>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>id</code>
            </td>
            <td>string</td>
            <td>The unique identifier of the object</td>
          </tr>
          <tr>
            <td>
              <code>mimeType</code>
            </td>
            <td>string</td>
            <td>
              The MIME type of the object (e.g., image/png, application/json)
            </td>
          </tr>
        </tbody>
      </table>

      <h4>Code Examples</h4>
      <div className="not-prose">
        <Tabs defaultValue="curl" className="w-full">
          <TabsList>
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
          </TabsList>
          <TabsContent value="curl" className="mt-4">
            <div className="relative">
              <Code language="bash" className="text-sm">
                {GET_OBJECT_SNIPPETS.curl(exampleObjectBaseUrl)}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() =>
                  handleCopy(GET_OBJECT_SNIPPETS.curl(exampleObjectBaseUrl))
                }
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="javascript" className="mt-4">
            <div className="relative">
              <Code language="javascript" className="text-sm">
                {GET_OBJECT_SNIPPETS.javascript(exampleObjectBaseUrl)}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() =>
                  handleCopy(
                    GET_OBJECT_SNIPPETS.javascript(exampleObjectBaseUrl)
                  )
                }
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="python" className="mt-4">
            <div className="relative">
              <Code language="python" className="text-sm">
                {GET_OBJECT_SNIPPETS.python(exampleObjectBaseUrl)}
              </Code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() =>
                  handleCopy(GET_OBJECT_SNIPPETS.python(exampleObjectBaseUrl))
                }
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <h2 id="rate-limits">Rate Limits</h2>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Requests per Hour</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Free</strong>
            </td>
            <td>100 requests</td>
          </tr>
          <tr>
            <td>
              <strong>Pro</strong>
            </td>
            <td>1,000 requests</td>
          </tr>
          <tr>
            <td>
              <strong>Enterprise</strong>
            </td>
            <td>Custom limits</td>
          </tr>
        </tbody>
      </table>

      <h2 id="error-handling">Error Handling</h2>
      <p>The API uses conventional HTTP status codes:</p>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>200</code>
            </td>
            <td>Success</td>
          </tr>
          <tr>
            <td>
              <code>400</code>
            </td>
            <td>Bad Request (invalid parameters)</td>
          </tr>
          <tr>
            <td>
              <code>401</code>
            </td>
            <td>Unauthorized (invalid API key)</td>
          </tr>
          <tr>
            <td>
              <code>404</code>
            </td>
            <td>Not Found (workflow or execution not found)</td>
          </tr>
          <tr>
            <td>
              <code>429</code>
            </td>
            <td>Too Many Requests (rate limit exceeded)</td>
          </tr>
          <tr>
            <td>
              <code>500</code>
            </td>
            <td>Internal Server Error</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <div className="my-8">
        <h2 className="text-xl font-semibold mb-4">Start Building</h2>
        <div className="text-muted-foreground mb-6">
          Get your API key and start integrating Dafthunk workflows into your
          applications.
        </div>
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link to="/settings/api-keys">
              Get API Key <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/workflows/deployments">View Deployments</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/docs/workflows">Learn Workflows</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
