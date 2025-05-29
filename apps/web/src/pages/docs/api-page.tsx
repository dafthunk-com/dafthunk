import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { CodeBlock } from "@/components/docs/code-block";
import { Button } from "@/components/ui/button";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsApiPage() {
  usePageBreadcrumbs([
    { label: "Documentation", to: "/docs" },
    { label: "API" },
  ]);

  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <h2>Base URL</h2>
      <p>All API requests should be made to:</p>
      <CodeBlock>https://api.dafthunk.com/v1</CodeBlock>

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
        <code>POST /api/workflows/{"{workflowId}"}/execute</code>
      </p>
      <p>
        <strong>Description:</strong> Execute a deployed workflow with input
        parameters
      </p>

      <h4>Request Body</h4>
      <CodeBlock language="json">{`{
  "inputs": {
    "parameter1": "value1",
    "parameter2": "value2"
  },
  "timeout": 300
}`}</CodeBlock>

      <h4>Response</h4>
      <CodeBlock language="json">{`{
  "executionId": "exec_1234567890",
  "status": "running",
  "createdAt": "2024-01-15T10:30:00Z"
}`}</CodeBlock>

      <h2 id="status-results">Status & Results</h2>

      <h3>Get Execution Status</h3>
      <p>
        Check execution status and retrieve results from completed workflows.
      </p>
      <p>
        <strong>Endpoint:</strong>{" "}
        <code>GET /api/executions/{"{executionId}"}</code>
      </p>
      <p>
        <strong>Description:</strong> Retrieve execution status and results
      </p>

      <h4>Response</h4>
      <CodeBlock language="json">{`{
  "executionId": "exec_1234567890",
  "status": "completed",
  "result": {
    "output": "Generated result data",
    "metadata": {...}
  },
  "startedAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:31:23Z",
  "duration": 83000
}`}</CodeBlock>

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
              <code>pending</code>
            </td>
            <td>Execution queued</td>
          </tr>
          <tr>
            <td>
              <code>running</code>
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
              <code>failed</code>
            </td>
            <td>Execution failed</td>
          </tr>
          <tr>
            <td>
              <code>timeout</code>
            </td>
            <td>Execution timed out</td>
          </tr>
        </tbody>
      </table>

      <h2>Rate Limits</h2>
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

      <h2>Error Handling</h2>
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

      <h2>Code Examples</h2>

      <h3>JavaScript/Node.js</h3>
      <CodeBlock language="javascript">{`const response = await fetch(
  "https://api.dafthunk.com/v1/workflows/wf_123/execute",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer your_api_key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: {
        text: "Hello, world!",
      },
    }),
  }
);

const execution = await response.json();
console.log("Execution ID:", execution.executionId);`}</CodeBlock>

      <h3>Python</h3>
      <CodeBlock language="python">{`import requests

response = requests.post(
    'https://api.dafthunk.com/v1/workflows/wf_123/execute',
    headers={
        'Authorization': 'Bearer your_api_key',
        'Content-Type': 'application/json'
    },
    json={
        'inputs': {
            'text': 'Hello, world!'
        }
    }
)

execution = response.json()
print(f"Execution ID: {execution['executionId']}")`}</CodeBlock>

      <h3>cURL</h3>
      <CodeBlock language="bash">{`curl -X POST https://api.dafthunk.com/v1/workflows/wf_123/execute \\
  -H "Authorization: Bearer your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"inputs": {"text": "Hello, world!"}}'`}</CodeBlock>

      <h2>SDKs and Libraries</h2>

      <h3>Official SDKs</h3>
      <ul>
        <li>
          <strong>JavaScript/TypeScript</strong> - <code>@dafthunk/js-sdk</code>
        </li>
        <li>
          <strong>Python</strong> - <code>dafthunk-python</code>
        </li>
        <li>
          <strong>Go</strong> - <code>dafthunk-go</code>
        </li>
      </ul>

      <h3>Community Libraries</h3>
      <ul>
        <li>
          <strong>PHP</strong> - <code>dafthunk/php-client</code>
        </li>
        <li>
          <strong>Ruby</strong> - <code>dafthunk-ruby</code>
        </li>
        <li>
          <strong>Java</strong> - <code>dafthunk-java</code>
        </li>
      </ul>

      <h2>Webhooks</h2>
      <p>
        Configure webhooks to receive real-time notifications about workflow
        executions.
      </p>

      <h3>Setup</h3>
      <ol>
        <li>
          Navigate to <strong>Settings → Webhooks</strong>
        </li>
        <li>Add your endpoint URL</li>
        <li>Select events to receive</li>
        <li>Configure authentication (optional)</li>
      </ol>

      <h3>Events</h3>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>execution.started</code>
            </td>
            <td>Workflow execution began</td>
          </tr>
          <tr>
            <td>
              <code>execution.completed</code>
            </td>
            <td>Execution finished successfully</td>
          </tr>
          <tr>
            <td>
              <code>execution.failed</code>
            </td>
            <td>Execution encountered an error</td>
          </tr>
          <tr>
            <td>
              <code>execution.timeout</code>
            </td>
            <td>Execution exceeded time limit</td>
          </tr>
        </tbody>
      </table>

      <h3>Payload Example</h3>
      <CodeBlock language="json">{`{
  "event": "execution.completed",
  "executionId": "exec_1234567890",
  "workflowId": "wf_123",
  "timestamp": "2024-01-15T10:31:23Z",
  "data": {
    "status": "completed",
    "duration": 83000,
    "result": {...}
  }
}`}</CodeBlock>

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
