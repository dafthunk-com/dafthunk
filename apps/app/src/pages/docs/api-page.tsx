import { CodeBlock } from "@/components/docs/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EXECUTE_ENDPOINT_SNIPPETS,
  GET_EXECUTION_STATUS_SNIPPETS,
  GET_OBJECT_SNIPPETS,
  PUBLISH_QUEUE_SNIPPETS,
  QUERY_DATABASE_SNIPPETS,
} from "@/components/workflow/api-snippets";
import { usePageBreadcrumbs } from "@/hooks/use-page";

function SnippetTabs({
  snippets,
}: {
  snippets: { curl: string; javascript: string; python: string };
}) {
  return (
    <div className="not-prose">
      <Tabs defaultValue="curl" className="w-full">
        <TabsList>
          <TabsTrigger value="curl">cURL</TabsTrigger>
          <TabsTrigger value="javascript">JavaScript</TabsTrigger>
          <TabsTrigger value="python">Python</TabsTrigger>
        </TabsList>
        <TabsContent value="curl" className="mt-4">
          <CodeBlock language="bash">{snippets.curl}</CodeBlock>
        </TabsContent>
        <TabsContent value="javascript" className="mt-4">
          <CodeBlock language="javascript">{snippets.javascript}</CodeBlock>
        </TabsContent>
        <TabsContent value="python" className="mt-4">
          <CodeBlock language="python">{snippets.python}</CodeBlock>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function DocsApiPage() {
  usePageBreadcrumbs([{ label: "API Reference" }]);

  const BASE_URL = "https://api.dafthunk.com";

  const exampleEndpointExecuteUrl = `${BASE_URL}/your-org/endpoints/my-endpoint/execute`;
  const exampleStatusBaseUrl = `${BASE_URL}/your-org/executions`;
  const exampleObjectBaseUrl = `${BASE_URL}/your-org/objects?id=YOUR_OBJECT_ID`;
  const exampleQueuePublishUrl = `${BASE_URL}/your-org/queues/my-queue/publish`;
  const exampleDatabaseQueryUrl = `${BASE_URL}/your-org/databases/my-database/query`;

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

        <h2 id="endpoint-execution">Endpoint Execution</h2>

        <h3>Execute Endpoint</h3>
        <p>
          Trigger workflow execution via an HTTP endpoint. Endpoints are created
          in the Dafthunk dashboard under <strong>Endpoints</strong> and linked
          to workflows through triggers. All enabled workflows connected to the
          endpoint will be executed.
        </p>
        <p>
          <strong>Route:</strong>{" "}
          <code>
            GET or POST /{"{orgHandle}"}/endpoints/{"{endpointIdOrHandle}"}
            /execute
          </code>
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
        <p>
          If multiple workflows are linked to the endpoint, the response
          contains an array:
        </p>
        <CodeBlock language="json">{`{
  "executions": [
    {
      "id": "exec_1234567890",
      "workflowId": "wf_123",
      "status": "submitted",
      "nodeExecutions": [...]
    },
    {
      "id": "exec_1234567891",
      "workflowId": "wf_456",
      "status": "submitted",
      "nodeExecutions": [...]
    }
  ]
}`}</CodeBlock>

        <h4>Code Examples</h4>
        <SnippetTabs
          snippets={{
            curl: EXECUTE_ENDPOINT_SNIPPETS.curl(exampleEndpointExecuteUrl),
            javascript: EXECUTE_ENDPOINT_SNIPPETS.javascript(
              exampleEndpointExecuteUrl
            ),
            python: EXECUTE_ENDPOINT_SNIPPETS.python(exampleEndpointExecuteUrl),
          }}
        />

        <h2 id="status-results">Execution Status</h2>

        <h3>Get Execution Status</h3>
        <p>
          Check execution status and retrieve results from completed workflows.
        </p>
        <p>
          <strong>Route:</strong>{" "}
          <code>
            GET /{"{orgHandle}"}/executions/{"{executionId}"}
          </code>
        </p>

        <h4>Response</h4>
        <CodeBlock language="json">{`{
  "execution": {
    "id": "exec_1234567890",
    "workflowId": "wf_123",
    "workflowName": "My Workflow",
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
    "startedAt": "2024-01-15T10:30:00.000Z",
    "endedAt": "2024-01-15T10:31:23.000Z"
  }
}`}</CodeBlock>

        <h4>Code Examples</h4>
        <SnippetTabs
          snippets={{
            curl: GET_EXECUTION_STATUS_SNIPPETS.curl(exampleStatusBaseUrl),
            javascript:
              GET_EXECUTION_STATUS_SNIPPETS.javascript(exampleStatusBaseUrl),
            python: GET_EXECUTION_STATUS_SNIPPETS.python(exampleStatusBaseUrl),
          }}
        />

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
          <strong>Route:</strong>{" "}
          <code>
            GET /{"{orgHandle}"}/objects?id={"{objectId}"}&mimeType=
            {"{mimeType}"}
          </code>
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
        <SnippetTabs
          snippets={{
            curl: GET_OBJECT_SNIPPETS.curl(exampleObjectBaseUrl),
            javascript: GET_OBJECT_SNIPPETS.javascript(exampleObjectBaseUrl),
            python: GET_OBJECT_SNIPPETS.python(exampleObjectBaseUrl),
          }}
        />

        <h2 id="queue-publishing">Queue Publishing</h2>

        <h3>Publish Message</h3>
        <p>
          Publish a message to a queue. Workflows with queue triggers connected
          to this queue will be executed with the message payload.
        </p>
        <p>
          <strong>Route:</strong>{" "}
          <code>
            POST /{"{orgHandle}"}/queues/{"{queueIdOrHandle}"}/publish
          </code>
        </p>

        <h4>Request Body</h4>
        <CodeBlock language="json">{`{
  "payload": {
    "event": "order_created",
    "data": { "id": 123 }
  }
}`}</CodeBlock>

        <h4>Response</h4>
        <CodeBlock language="json">{`{
  "success": true,
  "queueId": "queue_123",
  "timestamp": 1705312200000
}`}</CodeBlock>

        <h4>Code Examples</h4>
        <SnippetTabs
          snippets={{
            curl: PUBLISH_QUEUE_SNIPPETS.curl(exampleQueuePublishUrl),
            javascript: PUBLISH_QUEUE_SNIPPETS.javascript(
              exampleQueuePublishUrl
            ),
            python: PUBLISH_QUEUE_SNIPPETS.python(exampleQueuePublishUrl),
          }}
        />

        <h2 id="database-query">Database Query</h2>

        <h3>Execute Query</h3>
        <p>
          Execute a SQL query against a database. Databases are created in the
          Dafthunk dashboard under <strong>Databases</strong>.
        </p>
        <p>
          <strong>Route:</strong>{" "}
          <code>
            POST /{"{orgHandle}"}/databases/{"{databaseIdOrHandle}"}/query
          </code>
        </p>

        <h4>Request Body</h4>
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>sql</code>
              </td>
              <td>string</td>
              <td>Yes</td>
              <td>SQL query to execute</td>
            </tr>
            <tr>
              <td>
                <code>params</code>
              </td>
              <td>array</td>
              <td>No</td>
              <td>Query parameters for prepared statements</td>
            </tr>
          </tbody>
        </table>
        <CodeBlock language="json">{`{
  "sql": "SELECT * FROM users WHERE active = ?",
  "params": [true]
}`}</CodeBlock>

        <h4>Code Examples</h4>
        <SnippetTabs
          snippets={{
            curl: QUERY_DATABASE_SNIPPETS.curl(exampleDatabaseQueryUrl),
            javascript: QUERY_DATABASE_SNIPPETS.javascript(
              exampleDatabaseQueryUrl
            ),
            python: QUERY_DATABASE_SNIPPETS.python(exampleDatabaseQueryUrl),
          }}
        />

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
                <code>201</code>
              </td>
              <td>Created (returned by execute and publish endpoints)</td>
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
              <td>Not Found (resource not found)</td>
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
