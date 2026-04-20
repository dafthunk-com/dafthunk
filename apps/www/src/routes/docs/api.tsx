import { CodeBlock } from "../../components/docs/code-block";
import { CodeTabs } from "../../components/docs/code-tabs";
import { DocsLayout } from "../../components/docs/docs-layout";
import {
  EXECUTE_ENDPOINT_SNIPPETS,
  GET_EXECUTION_STATUS_SNIPPETS,
  GET_OBJECT_SNIPPETS,
  PUBLISH_QUEUE_SNIPPETS,
  QUERY_DATABASE_SNIPPETS,
} from "../../lib/api-snippets";
import { highlight, type SupportedLanguage } from "../../lib/shiki";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;
const API_BASE_URL = "https://api.dafthunk.com";

const SAMPLE_URLS = {
  endpointExecute: `${API_BASE_URL}/endpoints/my-endpoint/execute`,
  statusBase: `${API_BASE_URL}/your-org/executions`,
  objectBase: `${API_BASE_URL}/your-org/objects?id=YOUR_OBJECT_ID`,
  queuePublish: `${API_BASE_URL}/queues/my-queue/publish`,
  databaseQuery: `${API_BASE_URL}/your-org/databases/my-database/query`,
};

const RAW_BLOCKS = {
  baseUrl: API_BASE_URL,
  authHeader: "Authorization: Bearer YOUR_API_KEY",
  endpointRequest: `{
  "parameter1": "value1",
  "parameter2": "value2",
  "file_url": "https://example.com/file.pdf"
}`,
  endpointResponseSingle: `{
  "id": "exec_1234567890",
  "workflowId": "wf_123",
  "status": "submitted",
  "nodeExecutions": [
    {
      "nodeId": "node_1",
      "status": "executing"
    }
  ]
}`,
  endpointResponseMulti: `{
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
}`,
  executionResponse: `{
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
}`,
  queueRequest: `{
  "payload": {
    "event": "order_created",
    "data": { "id": 123 }
  }
}`,
  queueResponse: `{
  "success": true,
  "queueId": "queue_123",
  "timestamp": 1705312200000
}`,
  databaseRequest: `{
  "sql": "SELECT * FROM users WHERE active = ?",
  "params": [true]
}`,
} as const;

interface HighlightedTab {
  label: string;
  html: string;
  raw: string;
}

interface HighlightedSection {
  curl: HighlightedTab;
  javascript: HighlightedTab;
  python: HighlightedTab;
}

async function highlightTab(
  label: string,
  raw: string,
  lang: SupportedLanguage
): Promise<HighlightedTab> {
  const html = await highlight(raw, lang);
  return { label, html, raw };
}

async function highlightSnippetGroup(snippets: {
  curl: string;
  javascript: string;
  python: string;
}): Promise<HighlightedSection> {
  const [curl, javascript, python] = await Promise.all([
    highlightTab("cURL", snippets.curl, "bash"),
    highlightTab("JavaScript", snippets.javascript, "javascript"),
    highlightTab("Python", snippets.python, "python"),
  ]);
  return { curl, javascript, python };
}

interface HighlightedBlock {
  html: string;
  raw: string;
}

async function highlightBlock(
  raw: string,
  lang: SupportedLanguage
): Promise<HighlightedBlock> {
  const html = await highlight(raw, lang);
  return { html, raw };
}

interface LoaderData {
  blocks: {
    baseUrl: HighlightedBlock;
    authHeader: HighlightedBlock;
    endpointRequest: HighlightedBlock;
    endpointResponseSingle: HighlightedBlock;
    endpointResponseMulti: HighlightedBlock;
    executionResponse: HighlightedBlock;
    queueRequest: HighlightedBlock;
    queueResponse: HighlightedBlock;
    databaseRequest: HighlightedBlock;
  };
  sections: {
    endpointExecute: HighlightedSection;
    executionStatus: HighlightedSection;
    getObject: HighlightedSection;
    queuePublish: HighlightedSection;
    databaseQuery: HighlightedSection;
  };
}

export async function loader(): Promise<LoaderData> {
  const [
    baseUrl,
    authHeader,
    endpointRequest,
    endpointResponseSingle,
    endpointResponseMulti,
    executionResponse,
    queueRequest,
    queueResponse,
    databaseRequest,
    endpointExecute,
    executionStatus,
    getObject,
    queuePublish,
    databaseQuery,
  ] = await Promise.all([
    highlightBlock(RAW_BLOCKS.baseUrl, "bash"),
    highlightBlock(RAW_BLOCKS.authHeader, "http"),
    highlightBlock(RAW_BLOCKS.endpointRequest, "json"),
    highlightBlock(RAW_BLOCKS.endpointResponseSingle, "json"),
    highlightBlock(RAW_BLOCKS.endpointResponseMulti, "json"),
    highlightBlock(RAW_BLOCKS.executionResponse, "json"),
    highlightBlock(RAW_BLOCKS.queueRequest, "json"),
    highlightBlock(RAW_BLOCKS.queueResponse, "json"),
    highlightBlock(RAW_BLOCKS.databaseRequest, "json"),
    highlightSnippetGroup({
      curl: EXECUTE_ENDPOINT_SNIPPETS.curl(SAMPLE_URLS.endpointExecute),
      javascript: EXECUTE_ENDPOINT_SNIPPETS.javascript(
        SAMPLE_URLS.endpointExecute
      ),
      python: EXECUTE_ENDPOINT_SNIPPETS.python(SAMPLE_URLS.endpointExecute),
    }),
    highlightSnippetGroup({
      curl: GET_EXECUTION_STATUS_SNIPPETS.curl(SAMPLE_URLS.statusBase),
      javascript: GET_EXECUTION_STATUS_SNIPPETS.javascript(
        SAMPLE_URLS.statusBase
      ),
      python: GET_EXECUTION_STATUS_SNIPPETS.python(SAMPLE_URLS.statusBase),
    }),
    highlightSnippetGroup({
      curl: GET_OBJECT_SNIPPETS.curl(SAMPLE_URLS.objectBase),
      javascript: GET_OBJECT_SNIPPETS.javascript(SAMPLE_URLS.objectBase),
      python: GET_OBJECT_SNIPPETS.python(SAMPLE_URLS.objectBase),
    }),
    highlightSnippetGroup({
      curl: PUBLISH_QUEUE_SNIPPETS.curl(SAMPLE_URLS.queuePublish),
      javascript: PUBLISH_QUEUE_SNIPPETS.javascript(SAMPLE_URLS.queuePublish),
      python: PUBLISH_QUEUE_SNIPPETS.python(SAMPLE_URLS.queuePublish),
    }),
    highlightSnippetGroup({
      curl: QUERY_DATABASE_SNIPPETS.curl(SAMPLE_URLS.databaseQuery),
      javascript: QUERY_DATABASE_SNIPPETS.javascript(SAMPLE_URLS.databaseQuery),
      python: QUERY_DATABASE_SNIPPETS.python(SAMPLE_URLS.databaseQuery),
    }),
  ]);

  return {
    blocks: {
      baseUrl,
      authHeader,
      endpointRequest,
      endpointResponseSingle,
      endpointResponseMulti,
      executionResponse,
      queueRequest,
      queueResponse,
      databaseRequest,
    },
    sections: {
      endpointExecute,
      executionStatus,
      getObject,
      queuePublish,
      databaseQuery,
    },
  };
}

export function headers() {
  return {
    "Cache-Control": "public, max-age=3600, s-maxage=86400",
  };
}

export function meta() {
  const title = "API Reference - Dafthunk Documentation";
  const description =
    "Complete REST API reference for Dafthunk: authentication, endpoint execution, status polling, object retrieval, queue publishing, and database query.";
  const url = `${websiteUrl}/docs/api`;
  const ogImage = `${websiteUrl}/og-image.webp`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "article" },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:url", content: url },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
    { tagName: "link", rel: "canonical", href: url },
    { name: "robots", content: "index, follow" },
  ];
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: websiteUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "Documentation",
      item: `${websiteUrl}/docs`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "API Reference",
      item: `${websiteUrl}/docs/api`,
    },
  ],
};

function tabsFromSection(section: HighlightedSection) {
  return [section.curl, section.javascript, section.python];
}

export default function DocsApi({ loaderData }: { loaderData: LoaderData }) {
  const { blocks, sections } = loaderData;

  return (
    <DocsLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <h1>API Reference</h1>
      <p className="lead">
        Complete API documentation for integrating Dafthunk workflows into your
        applications, with examples in multiple programming languages.
      </p>

      <h2>Base URL</h2>
      <p>All API requests should be made to:</p>
      <CodeBlock html={blocks.baseUrl.html} raw={blocks.baseUrl.raw} />

      <h2 id="authentication">Authentication</h2>
      <p>
        API requests are authenticated using API keys. You can generate and
        manage your API keys from the Dafthunk dashboard under{" "}
        <strong>Settings → API Keys</strong>. Once you create a new API key,
        give it a descriptive name and ensure you copy and store it securely, as
        it won't be shown again.
      </p>
      <p>
        To authenticate your requests, include the API key in the{" "}
        <code>Authorization</code> header, using the Bearer scheme:
      </p>
      <CodeBlock html={blocks.authHeader.html} raw={blocks.authHeader.raw} />

      <h2 id="endpoint-execution">Endpoint Execution</h2>

      <h3>Execute Endpoint</h3>
      <p>
        Trigger workflow execution via an HTTP endpoint. Endpoints are created
        in the Dafthunk dashboard under <strong>Endpoints</strong> and linked to
        workflows through triggers. All enabled workflows connected to the
        endpoint will be executed.
      </p>
      <p>
        <strong>Route:</strong>{" "}
        <code>
          GET or POST /{"{orgId}"}/endpoints/{"{endpointId}"}/execute
        </code>
      </p>

      <h4>Request Body</h4>
      <p>
        The request body can be any valid JSON that will be passed to the
        workflow. The specific structure depends on your workflow's parameter
        nodes.
      </p>
      <CodeBlock
        html={blocks.endpointRequest.html}
        raw={blocks.endpointRequest.raw}
      />

      <h4>Response</h4>
      <CodeBlock
        html={blocks.endpointResponseSingle.html}
        raw={blocks.endpointResponseSingle.raw}
      />
      <p>
        If multiple workflows are linked to the endpoint, the response contains
        an array:
      </p>
      <CodeBlock
        html={blocks.endpointResponseMulti.html}
        raw={blocks.endpointResponseMulti.raw}
      />

      <h4>Code Examples</h4>
      <CodeTabs tabs={tabsFromSection(sections.endpointExecute)} />

      <h2 id="status-results">Execution Status</h2>

      <h3>Get Execution Status</h3>
      <p>
        Check execution status and retrieve results from completed workflows.
      </p>
      <p>
        <strong>Route:</strong>{" "}
        <code>
          GET /{"{orgId}"}/executions/{"{executionId}"}
        </code>
      </p>

      <h4>Response</h4>
      <CodeBlock
        html={blocks.executionResponse.html}
        raw={blocks.executionResponse.raw}
      />

      <h4>Code Examples</h4>
      <CodeTabs tabs={tabsFromSection(sections.executionStatus)} />

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
          GET /{"{orgId}"}/objects?id={"{objectId}"}&mimeType={"{mimeType}"}
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
      <CodeTabs tabs={tabsFromSection(sections.getObject)} />

      <h2 id="queue-publishing">Queue Publishing</h2>

      <h3>Publish Message</h3>
      <p>
        Publish a message to a queue. Workflows with queue triggers connected to
        this queue will be executed with the message payload.
      </p>
      <p>
        <strong>Route:</strong> <code>POST /queues/{"{queueId}"}/publish</code>
      </p>

      <h4>Request Body</h4>
      <CodeBlock
        html={blocks.queueRequest.html}
        raw={blocks.queueRequest.raw}
      />

      <h4>Response</h4>
      <CodeBlock
        html={blocks.queueResponse.html}
        raw={blocks.queueResponse.raw}
      />

      <h4>Code Examples</h4>
      <CodeTabs tabs={tabsFromSection(sections.queuePublish)} />

      <h2 id="database-query">Database Query</h2>

      <h3>Execute Query</h3>
      <p>
        Execute a SQL query against a database. Databases are created in the
        Dafthunk dashboard under <strong>Databases</strong>.
      </p>
      <p>
        <strong>Route:</strong>{" "}
        <code>
          POST /{"{orgId}"}/databases/{"{databaseId}"}/query
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
      <CodeBlock
        html={blocks.databaseRequest.html}
        raw={blocks.databaseRequest.raw}
      />

      <h4>Code Examples</h4>
      <CodeTabs tabs={tabsFromSection(sections.databaseQuery)} />

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
    </DocsLayout>
  );
}
