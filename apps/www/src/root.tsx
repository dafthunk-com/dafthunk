import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import stylesheet from "./app.css?url";

export const links = () => [
  {
    rel: "preload",
    href: "/fonts/InterVariable.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.dafthunk.com/#organization",
        name: "Dafthunk",
        url: "https://www.dafthunk.com",
        logo: {
          "@type": "ImageObject",
          url: "https://www.dafthunk.com/icon.svg",
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
        "@id": "https://www.dafthunk.com/#website",
        url: "https://www.dafthunk.com",
        name: "Dafthunk",
        description:
          "Visual workflow automation platform for building serverless workflows on edge infrastructure",
        publisher: {
          "@id": "https://www.dafthunk.com/#organization",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://www.dafthunk.com/#application",
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
