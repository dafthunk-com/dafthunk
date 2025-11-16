import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://dafthunk.com/#organization",
        name: "Dafthunk",
        url: "https://dafthunk.com",
        logo: {
          "@type": "ImageObject",
          url: "https://dafthunk.com/icon.svg",
        },
        sameAs: ["https://github.com/dafthunk-com/dafthunk"],
        contactPoint: {
          "@type": "ContactPoint",
          email: "contact@dafthunk.com",
          contactType: "Customer Service",
        },
      },
      {
        "@type": "WebSite",
        "@id": "https://dafthunk.com/#website",
        url: "https://dafthunk.com",
        name: "Dafthunk",
        description:
          "Visual workflow automation platform for building serverless workflows on edge infrastructure",
        publisher: {
          "@id": "https://dafthunk.com/#organization",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://dafthunk.com/#application",
        name: "Dafthunk",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "Build serverless workflow automation with a React Flow editor. Deploy AI workflows, web scraping, ETL pipelines, and integrations on edge infrastructure.",
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://rsms.me" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <link
          rel="preconnect"
          href="https://www.youtube-nocookie.com"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Meta />
        <Links />
      </head>
      <body className="font-sans">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
