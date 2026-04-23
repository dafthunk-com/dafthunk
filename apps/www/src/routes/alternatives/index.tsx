import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import alternativesData from "../../../data/alternatives.json";
import { Layout } from "../../components/layout";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

interface Alternative {
  id: string;
  name: string;
  tagline: string;
  metaDescription: string;
  category: string;
  license: string;
  deployment: string;
  website: string;
  verifiedAt: string;
  published: boolean;
}

const { alternatives } = alternativesData as { alternatives: Alternative[] };

export const meta: MetaFunction = () => {
  const title = "Dafthunk alternatives to n8n, Zapier, Make, and more";
  const description =
    "Compare Dafthunk with n8n, Zapier, Make, Dify, and more. Open source, serverless visual workflow automation with AI on Cloudflare. MIT licensed.";
  const url = `${websiteUrl}/alternatives`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: `${websiteUrl}/og-image.webp` },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:url", content: url },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: `${websiteUrl}/og-image.webp` },
    { tagName: "link", rel: "canonical", href: url },
    { name: "robots", content: "index, follow" },
  ];
};

export default function AlternativesIndexPage() {
  const published = alternatives.filter((a) => a.published);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Dafthunk alternatives to n8n, Zapier, Make, Dify, Langflow, Flowise",
    itemListElement: published.map((alt, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${websiteUrl}/alternatives/${alt.id}`,
      name: `Dafthunk vs ${alt.name}`,
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: websiteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Alternatives",
        item: `${websiteUrl}/alternatives`,
      },
    ],
  };

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main className="px-6 py-32">
        <Link
          to="/"
          className="inline-flex items-center text-base text-gray-600 hover:text-gray-900 mb-8"
        >
          &larr; Back to Home
        </Link>

        <div className="mb-32">
          <h1 className="text-6xl font-light text-gray-900 mb-6">
            Dafthunk alternatives
          </h1>
          <p className="text-3xl text-gray-500">
            Side-by-side comparisons with the tools you are already considering.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {published.map((alternative) => (
            <Link
              key={alternative.id}
              to={`/alternatives/${alternative.id}`}
              className="group block bg-white rounded-xl p-6 shadow-xs hover:shadow-md transition-shadow"
            >
              <h2 className="text-2xl font-light text-gray-900 group-hover:text-black transition-colors">
                Dafthunk vs {alternative.name}
              </h2>
              <p className="text-base text-gray-600 mt-3 leading-relaxed">
                {alternative.tagline}
              </p>
            </Link>
          ))}
        </div>

        {published.length === 0 && (
          <p className="text-xl text-gray-500">
            Comparison pages are being written. Check back soon.
          </p>
        )}
      </main>
    </Layout>
  );
}
