import alternativesData from "../../data/alternatives.json";
import blogData from "../../data/blog-posts.json";
import categories from "../../data/categories.json";
import workflowsData from "../../data/workflows.json";
import { canonicalNodePaths } from "../lib/nodes";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

interface SitemapEntry {
  loc: string;
  // Only set when a genuine content-change date is known; stamping every URL
  // with the build date teaches crawlers to ignore the signal entirely.
  lastmod?: string;
}

export function loader() {
  const baseUrl = websiteUrl;

  const staticPages: SitemapEntry[] = [
    { loc: "/" },
    { loc: "/terms" },
    { loc: "/privacy" },
    { loc: "/cookies", lastmod: "2025-11-23" },
  ];

  // Node paths come from canonicalNodePaths(), not from the category arrays, so
  // a node listed in two categories is still advertised at a single URL.
  const nodePages: SitemapEntry[] = [
    { loc: "/nodes" },
    ...categories.categories.map((category) => ({
      loc: `/nodes/${category.id}`,
    })),
    ...canonicalNodePaths().map((loc) => ({ loc })),
  ];

  const workflowPages: SitemapEntry[] = [
    { loc: "/workflows" },
    ...workflowsData.workflows.map((workflow) => ({
      loc: `/workflows/${workflow.id}`,
    })),
  ];

  const alternativePages: SitemapEntry[] = [
    { loc: "/alternatives" },
    ...alternativesData.alternatives
      .filter((alternative) => alternative.published)
      .map((alternative) => ({
        loc: `/alternatives/${alternative.id}`,
        lastmod: alternative.verifiedAt,
      })),
  ];

  const docsPages: SitemapEntry[] = [
    { loc: "/docs" },
    { loc: "/docs/concepts" },
    { loc: "/docs/nodes" },
    { loc: "/docs/api" },
    { loc: "/docs/developers" },
  ];

  const blogPages: SitemapEntry[] = [
    { loc: "/blog" },
    ...blogData.posts
      .filter((post) => post.published)
      .map((post: { id: string; date: string; updated?: string }) => ({
        loc: `/blog/${post.id}`,
        lastmod: post.updated ?? post.date,
      })),
  ];

  const allPages = [
    ...staticPages,
    ...nodePages,
    ...workflowPages,
    ...alternativePages,
    ...docsPages,
    ...blogPages,
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map((page) => {
    const lastmod = page.lastmod
      ? `\n    <lastmod>${page.lastmod}</lastmod>`
      : "";
    return `  <url>
    <loc>${baseUrl}${page.loc}</loc>${lastmod}
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
