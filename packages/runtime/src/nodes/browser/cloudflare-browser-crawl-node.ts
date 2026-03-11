import { MultiStepNode, type MultiStepNodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { calculateBrowserUsage } from "../../utils/usage";

interface CrawlJob {
  id: string;
  status: string;
}

interface CrawlResult {
  success: boolean;
  result: {
    id: string;
    status: string;
    data?: CrawlPage[];
  };
}

interface CrawlPage {
  url: string;
  [key: string]: unknown;
}

// Node config inputs that should not be forwarded to the Crawl API
const CONFIG_INPUTS = new Set(["timeout", "poll_interval"]);

/**
 * Cloudflare Browser Rendering Crawl Node
 * Crawls multiple pages starting from a URL using the async /crawl endpoint.
 * See: https://developers.cloudflare.com/browser-rendering/rest-api/crawl-endpoint/
 */
export class CloudflareBrowserCrawlNode extends MultiStepNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-browser-crawl",
    name: "Browser Crawl",
    type: "cloudflare-browser-crawl",
    description:
      "Crawl multiple pages starting from a URL using Cloudflare Browser Rendering.",
    documentation: `Crawls multiple pages starting from a URL. The crawl follows links up to the configured depth and limit.

### Output formats

By default returns markdown. You can request multiple formats: \`html\`, \`markdown\`, \`json\`.

### How it works

1. Submits a crawl job to Cloudflare
2. Polls until the job completes (or times out)
3. Returns all crawled pages

See [Cloudflare Browser Rendering Crawl Endpoint](https://developers.cloudflare.com/browser-rendering/rest-api/crawl-endpoint/) for details.`,
    referenceUrl:
      "https://developers.cloudflare.com/browser-rendering/rest-api/crawl-endpoint/",
    tags: ["Browser", "Web", "Cloudflare", "Crawl"],
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
        maximum: 120,
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
        name: "pages",
        type: "json",
        description: "Array of crawled page results",
      },
      {
        name: "count",
        type: "number",
        description: "Number of pages crawled",
      },
      {
        name: "error",
        type: "string",
        description: "Error message if the crawl fails",
        hidden: true,
      },
    ],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const startTime = Date.now();

    try {
      const { url } = context.inputs;
      if (!url || typeof url !== "string") {
        return this.createErrorResult("'url' is required.");
      }

      const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = context.env;
      if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        return this.createErrorResult(
          "'CLOUDFLARE_ACCOUNT_ID' and 'CLOUDFLARE_API_TOKEN' are required."
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

      // Default formats to markdown if not provided
      if (!body.formats) {
        body.formats = ["markdown"];
      }

      // Submit crawl job
      const { sleep, doStep } = context;

      const job = await doStep(async () => {
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
        const json = (await response.json()) as CrawlResult;
        if (!json.success || !json.result?.id) {
          throw new Error(`Crawl job creation failed: ${JSON.stringify(json)}`);
        }
        return { id: json.result.id, status: json.result.status } as CrawlJob;
      });

      // Poll until terminal status
      const maxPolls = Math.ceil((timeoutMinutes * 60) / pollIntervalSec);
      const pollIntervalMs = pollIntervalSec * 1000;
      const terminalStatuses = new Set([
        "completed",
        "errored",
        "cancelled_by_user",
        "cancelled_by_system",
      ]);

      let status = job.status;
      for (let i = 0; i < maxPolls && !terminalStatuses.has(status); i++) {
        await sleep(pollIntervalMs);

        status = await doStep(async () => {
          const response = await fetch(`${baseUrl}/${job.id}?limit=1`, {
            headers,
          });
          if (!response.ok) {
            const text = await response.text();
            throw new Error(
              `Failed to poll crawl status: ${response.status} ${text}`
            );
          }
          const json = (await response.json()) as CrawlResult;
          return json.result.status;
        });
      }

      if (status === "errored") {
        return this.createErrorResult("Crawl job failed.");
      }
      if (status.startsWith("cancelled")) {
        return this.createErrorResult(`Crawl job was cancelled: ${status}`);
      }
      if (!terminalStatuses.has(status)) {
        return this.createErrorResult(
          `Crawl timed out after ${timeoutMinutes} minutes (status: ${status})`
        );
      }

      // Fetch full results
      const pages = await doStep(async () => {
        const response = await fetch(`${baseUrl}/${job.id}`, { headers });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `Failed to fetch crawl results: ${response.status} ${text}`
          );
        }
        const json = (await response.json()) as CrawlResult;
        return json.result.data ?? [];
      });

      const usage = calculateBrowserUsage(Date.now() - startTime);
      return this.createSuccessResult({ pages, count: pages.length }, usage);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
