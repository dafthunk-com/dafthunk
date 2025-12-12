import categories from "../../data/categories.json";

export async function loader() {
  const baseUrl = "https://www.dafthunk.com";
  const today = new Date().toISOString().split("T")[0];

  const staticPages = [
    { loc: "/", lastmod: today, changefreq: "weekly", priority: "1.0" },
    { loc: "/legal", lastmod: "2025-11-23", changefreq: "monthly", priority: "0.3" },
    { loc: "/cookies", lastmod: "2025-11-23", changefreq: "monthly", priority: "0.3" },
  ];

  const categoryPages = categories.categories.map((category) => ({
    loc: `/nodes/${category.id}`,
    lastmod: today,
    changefreq: "weekly",
    priority: "0.8",
  }));

  const nodePages = categories.categories.flatMap((category) =>
    category.nodeIds.map((nodeId) => ({
      loc: `/nodes/${category.id}/${nodeId}`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.6",
    }))
  );

  const allPages = [...staticPages, ...categoryPages, ...nodePages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
