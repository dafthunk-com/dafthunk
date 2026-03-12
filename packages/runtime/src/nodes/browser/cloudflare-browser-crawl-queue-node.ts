import { MultiStepNode, type MultiStepNodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { calculateBrowserUsage } from "../../utils/usage";

interface CrawlSubmitResult {
  success: boolean;
  result: string;
}

interface CrawlStatusResult {
  success: boolean;
  result: {
    id: string;
    status: string;
    total?: number;
    finished?: number;
    records?: CrawlPage[];
    cursor?: string;
  };
}

interface CrawlPage {
  url: string;
  [key: string]: unknown;
}

// Node config inputs that should not be forwarded to the Crawl API
const CONFIG_INPUTS = new Set(["timeout", "poll_interval", "queueId"]);

/**
 * Cloudflare Browser Rendering Crawl to Queue Node
 * Crawls a website and sends each batch of results as messages to a queue.
 * See: https://developers.cloudflare.com/browser-rendering/rest-api/crawl-endpoint/
 */
export class CloudflareBrowserCrawlQueueNode extends MultiStepNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-crawl-queue",
    name: "Browser Crawl to Queue",
    type: "cloudflare-browser-crawl-queue",
    description:
      "Crawl a website and send each page as a message to a queue for downstream processing.",
    documentation: `Crawls a website and sends each crawled page as an individual message to a queue. This lets you process pages one by one in a workflow triggered by the queue, without loading all results into memory.

### When to use this node

Use **Browser Crawl to Queue** when you want to process each crawled page independently — for example, extracting data, summarizing content, or indexing pages. Each page becomes a separate queue message, so the receiving workflow handles one page at a time.

For simpler crawls where you need all pages at once, use **Browser Crawl** instead.

### How it works

1. Submits a crawl job to Cloudflare and waits for completion
2. Fetches results in batches (cursor-based pagination)
3. Sends each page as an individual message to the specified queue
4. Returns the total number of pages sent

See [Cloudflare Browser Rendering Crawl Endpoint](https://developers.cloudflare.com/browser-rendering/rest-api/crawl-endpoint/) for details.`,
    referenceUrl:
      "https://developers.cloudflare.com/browser-rendering/rest-api/crawl-endpoint/",
    tags: ["Browser", "Web", "Cloudflare", "Crawl", "Queue"],
    icon: "globe",
    inlinable: false,
    usage: 10,
    asTool: true,
    inputs: [
      {
        name: "url",
        type: "string",
        description: "Starting URL to crawl",
        required: true,
      },
      {
        name: "queueId",
        type: "queue",
        description: "Queue to send crawled pages to",
        required: true,
        hidden: true,
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of pages to crawl (max 100,000)",
        default: 10,
        minimum: 1,
        maximum: 100000,
      },
      {
        name: "depth",
        type: "number",
        description: "Link depth from starting URL",
        hidden: true,
      },
      {
        name: "render",
        type: "boolean",
        description: "Execute JavaScript on crawled pages",
        default: true,
        hidden: true,
      },
      {
        name: "formats",
        type: "json",
        description:
          'Output formats: array of "html", "markdown", "json" (default: ["markdown"])',
        hidden: true,
      },
      {
        name: "source",
        type: "string",
        description: "URL discovery method: all, sitemaps, links",
        hidden: true,
      },
      {
        name: "maxAge",
        type: "number",
        description: "Cache duration in seconds",
        hidden: true,
      },
      {
        name: "timeout",
        type: "number",
        description: "Maximum time to wait for crawl to complete (minutes)",
        default: 30,
        minimum: 1,
        maximum: 10080,
        hidden: true,
      },
      {
        name: "poll_interval",
        type: "number",
        description: "Time between status checks (seconds)",
        default: 10,
        minimum: 1,
        maximum: 60,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "count",
        type: "number",
        description: "Total number of pages sent to the queue",
      },
      {
        name: "error",
        type: "string",
        description: "Error message if the crawl or queue send fails",
        hidden: true,
      },
    ],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const startTime = Date.now();

    try {
      const { url, queueId: queueIdOrHandle } = context.inputs;
      if (!url || typeof url !== "string") {
        return this.createErrorResult("'url' is required.");
      }
      if (!queueIdOrHandle) {
        return this.createErrorResult("'queueId' is required.");
      }

      const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = context.env;
      if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        return this.createErrorResult(
          "'CLOUDFLARE_ACCOUNT_ID' and 'CLOUDFLARE_API_TOKEN' are required."
        );
      }

      if (!context.queueService) {
        return this.createErrorResult("Queue service is not available.");
      }

      const queue = await context.queueService.resolve(
        queueIdOrHandle,
        context.organizationId
      );
      if (!queue) {
        return this.createErrorResult(
          `Queue '${queueIdOrHandle}' not found or does not belong to your organization.`
        );
      }

      const timeoutMinutes = Math.max(1, Number(context.inputs.timeout) || 30);
      const pollIntervalSec = Math.max(
        1,
        Number(context.inputs.poll_interval) || 10
      );

      const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/browser-rendering/crawl`;
      const headers = {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      };

      // Build request body, excluding config inputs
      const body: Record<string, unknown> = { url };
      for (const [key, value] of Object.entries(context.inputs)) {
        if (
          CONFIG_INPUTS.has(key) ||
          key === "url" ||
          value === undefined ||
          value === null
        ) {
          continue;
        }
        body[key] = value;
      }

      if (!body.formats) {
        body.formats = ["markdown"];
      }

      // Submit crawl job
      const { sleep, doStep } = context;

      const jobId = await doStep(async () => {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `Failed to create crawl job: ${response.status} ${text}`
          );
        }
        const json = (await response.json()) as CrawlSubmitResult;
        if (!json.success || !json.result) {
          throw new Error(`Crawl job creation failed: ${JSON.stringify(json)}`);
        }
        return json.result;
      });

      // Poll until terminal status
      const maxPolls = Math.ceil((timeoutMinutes * 60) / pollIntervalSec);
      const pollIntervalMs = pollIntervalSec * 1000;
      const terminalStatuses = new Set([
        "completed",
        "errored",
        "cancelled_by_user",
        "cancelled_due_timeout",
        "cancelled_due_to_limits",
      ]);

      let status = "pending";
      for (let i = 0; i < maxPolls && !terminalStatuses.has(status); i++) {
        await sleep(pollIntervalMs);

        status = await doStep(async () => {
          const response = await fetch(`${baseUrl}/${jobId}?limit=1`, {
            headers,
          });
          if (response.status === 404) {
            return "pending";
          }
          if (!response.ok) {
            const text = await response.text();
            throw new Error(
              `Failed to poll crawl status: ${response.status} ${text}`
            );
          }
          const json = (await response.json()) as CrawlStatusResult;
          return json.result.status;
        });
      }

      if (status === "errored") {
        return this.createErrorResult("Crawl job failed.");
      }
      if (status.startsWith("cancelled")) {
        const reason = status.replace("cancelled_", "").replace(/_/g, " ");
        return this.createErrorResult(`Crawl job was cancelled (${reason}).`);
      }
      if (!terminalStatuses.has(status)) {
        return this.createErrorResult(
          `Crawl timed out after ${timeoutMinutes} minutes (status: ${status})`
        );
      }

      // Fetch results page by page and send each page to the queue
      let totalSent = 0;
      let cursor: string | undefined;

      do {
        const pageResult = await doStep(async () => {
          const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
          const response = await fetch(`${baseUrl}/${jobId}${params}`, {
            headers,
          });
          if (!response.ok) {
            const text = await response.text();
            throw new Error(
              `Failed to fetch crawl results: ${response.status} ${text}`
            );
          }
          return (await response.json()) as CrawlStatusResult;
        });

        const records = pageResult.result.records ?? [];
        if (records.length > 0) {
          await doStep(async () => {
            await queue.sendBatch(records);
          });
          totalSent += records.length;
        }

        cursor = pageResult.result.cursor;
      } while (cursor);

      const usage = calculateBrowserUsage(Date.now() - startTime);
      return this.createSuccessResult({ count: totalSent }, usage);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
