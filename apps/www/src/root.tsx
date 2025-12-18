import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { CookieConsent } from "./components/cookie-consent";
import stylesheet from "./app.css?url";

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
          "Visual workflow automation platform for building serverless workflows on edge infrastructure",
        publisher: {
          "@id": `${websiteUrl}/#organization`,
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${websiteUrl}/#application`,
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
