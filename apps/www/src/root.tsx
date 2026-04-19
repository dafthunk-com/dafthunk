import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";
import stylesheet from "./app.css?url";
import { CookieConsent } from "./components/cookie-consent";

export const links = () => [
  {
    rel: "preload",
    href: "/fonts/InterVariable.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  { rel: "preload", href: stylesheet, as: "style" },
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
  { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${websiteUrl}/#organization`,
        name: "Dafthunk",
        url: websiteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${websiteUrl}/icon.svg`,
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
        "@id": `${websiteUrl}/#website`,
        url: websiteUrl,
        name: "Dafthunk",
        description:
          "Open source, serverless visual workflow automation with AI on Cloudflare. MIT licensed.",
        publisher: {
          "@id": `${websiteUrl}/#organization`,
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${websiteUrl}/#application`,
        name: "Dafthunk",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Workflow Automation",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "Open source, serverless visual workflow automation with AI on Cloudflare. Build AI workflows, web scraping, and data pipelines by connecting nodes. MIT licensed.",
        keywords:
          "open source workflow automation, MIT licensed workflow automation, serverless workflow automation, Cloudflare Workers workflow, AI workflow automation, agentic workflow, visual workflow builder, no-code workflow, self-hosted workflow, n8n alternative, Zapier alternative, Make alternative",
        featureList: [
          "Visual workflow editor with 470+ nodes",
          "Serverless execution on Cloudflare Workers, scales to zero",
          "Durable long-running workflows on Cloudflare Workflows",
          "Native AI bindings: Workers AI, OpenAI, Anthropic, Gemini",
          "Agentic workflows: any node can be a tool for an AI agent",
          "Built-in D1 SQL, R2 object storage, KV, and Analytics Engine",
          "Webhook, cron, queue, email, and manual triggers",
          "MIT licensed, self-host on your own Cloudflare account",
        ],
        license: "https://opensource.org/licenses/MIT",
        codeRepository: "https://github.com/dafthunk-com/dafthunk",
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
        {gaMeasurementId && (
          <>
            <link
              rel="preconnect"
              href="https://www.googletagmanager.com"
              crossOrigin="anonymous"
            />
            {/* Google Consent Mode v2 - Default denied, updated by consent banner */}
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('consent', 'default', {
                    'ad_storage': 'denied',
                    'ad_user_data': 'denied',
                    'ad_personalization': 'denied',
                    'analytics_storage': 'denied'
                  });
                `,
              }}
            />
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaMeasurementId}');
                `,
              }}
            />
          </>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Meta />
        <Links />
      </head>
      <body className="font-sans">
        {children}
        <CookieConsent />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const websiteUrl = import.meta.env.VITE_WEBSITE_URL;
  const isRouteError = isRouteErrorResponse(error);
  const status = isRouteError ? error.status : 500;
  const isNotFound = status === 404;
  const title = isNotFound
    ? "Page not found - Dafthunk"
    : "Something went wrong - Dafthunk";
  const description = isNotFound
    ? "Page not found. Explore Dafthunk: open source, serverless visual workflow automation with AI on Cloudflare. Browse nodes, use cases, and alternatives."
    : "Unexpected error. Head back to Dafthunk: open source, serverless visual workflow automation with AI on Cloudflare. Browse nodes, use cases, alternatives.";
  const heading = isNotFound ? "Page not found" : "Something went wrong";
  const message = isNotFound
    ? "The page you are looking for doesn't exist or has moved."
    : "An unexpected error occurred. Please try again in a moment.";
  const ogImage = `${websiteUrl}/og-image.webp`;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, follow" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="Dafthunk" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        <Links />
      </head>
      <body className="font-sans">
        <main className="min-h-screen bg-stone-100 bg-dot-grid flex items-center justify-center px-6 py-32">
          <div className="max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-6">
              Error {status}
            </p>
            <h1 className="text-6xl font-light text-gray-900 mb-6 leading-[1.1]">
              {heading}
            </h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              {message}
            </p>
            <nav
              aria-label="Related pages"
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <a
                href="/"
                className="inline-block text-lg bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Back to home
              </a>
              <a
                href="/nodes"
                className="inline-block text-lg bg-white border border-gray-300 text-gray-900 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Browse nodes
              </a>
              <a
                href="/workflows"
                className="inline-block text-lg bg-white border border-gray-300 text-gray-900 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Use cases
              </a>
              <a
                href="/alternatives"
                className="inline-block text-lg bg-white border border-gray-300 text-gray-900 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Alternatives
              </a>
            </nav>
          </div>
        </main>
        <Scripts />
      </body>
    </html>
  );
}
