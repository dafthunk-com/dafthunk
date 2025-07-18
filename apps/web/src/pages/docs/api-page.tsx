import {
  EXECUTE_WORKFLOW_SNIPPETS,
  GET_EXECUTION_STATUS_SNIPPETS,
  GET_OBJECT_SNIPPETS,
} from "@/components/deployments/api-snippets";
import { CodeBlock } from "@/components/docs/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsApiPage() {
  usePageBreadcrumbs([
    { label: "Documentation", to: "/docs" },
    { label: "API" },
  ]);

  const BASE_URL = "https://api.dafthunk.com";

  // Example URLs for documentation
  const exampleExecuteUrl = `${BASE_URL}/your-org/workflows/wf_123/execute/v1`;
  const exampleStatusBaseUrl = `${BASE_URL}/your-org/executions`;
  const exampleObjectBaseUrl = `${BASE_URL}/your-org/objects?id=YOUR_OBJECT_ID`;

  return (
    <>
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight">API Reference</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Complete API documentation for integrating Dafthunk workflows into
          your applications, with examples in multiple programming languages.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none docs-content">
        <h2>Base URL</h2>
        <p>All API requests should be made to:</p>
        <CodeBlock>{BASE_URL}</CodeBlock>

        <h2 id="authentication">Authentication</h2>
        <p>
          API requests are authenticated using API keys. You can generate and
          manage your API keys from the Dafthunk dashboard under{" "}
          <strong>Settings → API Keys</strong>. Once you create a new API key,
          give it a descriptive name and ensure you copy and store it securely,
          as it won't be shown again.
        </p>
        <p>
          To authenticate your requests, include the API key in the{" "}
          <code>Authorization</code>
          header, using the Bearer scheme:
        </p>
        <CodeBlock language="http">
          Authorization: Bearer YOUR_API_KEY
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
              <CodeBlock language="bash">
                {EXECUTE_WORKFLOW_SNIPPETS.curl(exampleExecuteUrl, true, [])}
              </CodeBlock>
            </TabsContent>
            <TabsContent value="javascript" className="mt-4">
              <CodeBlock language="javascript">
                {EXECUTE_WORKFLOW_SNIPPETS.javascript(
                  exampleExecuteUrl,
                  true,
                  []
                )}
              </CodeBlock>
            </TabsContent>
            <TabsContent value="python" className="mt-4">
              <CodeBlock language="python">
                {EXECUTE_WORKFLOW_SNIPPETS.python(exampleExecuteUrl, true, [])}
              </CodeBlock>
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
              <CodeBlock language="bash">
                {GET_EXECUTION_STATUS_SNIPPETS.curl(exampleStatusBaseUrl)}
              </CodeBlock>
            </TabsContent>
            <TabsContent value="javascript" className="mt-4">
              <CodeBlock language="javascript">
                {GET_EXECUTION_STATUS_SNIPPETS.javascript(exampleStatusBaseUrl)}
              </CodeBlock>
            </TabsContent>
            <TabsContent value="python" className="mt-4">
              <CodeBlock language="python">
                {GET_EXECUTION_STATUS_SNIPPETS.python(exampleStatusBaseUrl)}
              </CodeBlock>
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
              <CodeBlock language="bash">
                {GET_OBJECT_SNIPPETS.curl(exampleObjectBaseUrl)}
              </CodeBlock>
            </TabsContent>
            <TabsContent value="javascript" className="mt-4">
              <CodeBlock language="javascript">
                {GET_OBJECT_SNIPPETS.javascript(exampleObjectBaseUrl)}
              </CodeBlock>
            </TabsContent>
            <TabsContent value="python" className="mt-4">
              <CodeBlock language="python">
                {GET_OBJECT_SNIPPETS.python(exampleObjectBaseUrl)}
              </CodeBlock>
            </TabsContent>
          </Tabs>
        </div>

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
      </div>
    </>
  );
}
