const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

export function loader() {
  const body = `User-agent: *
Allow: /

Sitemap: ${websiteUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
