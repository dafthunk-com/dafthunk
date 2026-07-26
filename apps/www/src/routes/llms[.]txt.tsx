const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

export function loader() {
  const body = `# Dafthunk

> Dafthunk is an open source, MIT licensed visual workflow automation platform
> that runs on Cloudflare's serverless infrastructure (Workers, Workflows, D1,
> R2, Durable Objects). Build workflows by connecting 470+ nodes — AI models,
> browser automation, data processing, media, and third-party integrations — in
> a visual editor, then run them serverless with scale-to-zero pricing. No
> enterprise tier, no fair-code restrictions; self-host on your own Cloudflare
> account or use the hosted version.

## Documentation

- [Core Concepts](${websiteUrl}/docs/concepts): workflows, nodes, executions, and triggers explained
- [Nodes Reference](${websiteUrl}/docs/nodes): the node catalog and how nodes compose
- [API Reference](${websiteUrl}/docs/api): HTTP API for running and managing workflows
- [Developers Guide](${websiteUrl}/docs/developers): self-hosting and contributing

## Comparisons

- [Alternatives overview](${websiteUrl}/alternatives): how Dafthunk compares to other workflow tools
- [Dafthunk vs n8n](${websiteUrl}/alternatives/n8n): MIT license vs fair-code, serverless vs containers
- [Dafthunk vs Zapier](${websiteUrl}/alternatives/zapier)
- [Dafthunk vs Make](${websiteUrl}/alternatives/make)

## Product

- [Workflow templates](${websiteUrl}/workflows): example automations you can copy
- [Node catalog](${websiteUrl}/nodes): browse nodes by category
- [Blog](${websiteUrl}/blog): engineering notes on agents and workflows
- [Best low-code workflow automation tools](${websiteUrl}/blog/best-low-code-workflow-automation-tools): ten tools compared by job, hosting model, and licensing terms

## Source

- [GitHub repository](https://github.com/dafthunk-com/dafthunk): full source, MIT licensed
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
