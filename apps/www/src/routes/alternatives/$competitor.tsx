import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, Link } from "react-router";
import alternativesData from "../../../data/alternatives.json";
import { Layout } from "../../components/layout";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

interface Differentiator {
  title: string;
  dafthunk: string;
  competitor: string;
}

interface FeatureMatrixRow {
  feature: string;
  dafthunk: string;
  competitor: string;
}

interface FeatureMatrixGroup {
  category: string;
  rows: FeatureMatrixRow[];
}

interface Faq {
  question: string;
  answer: string;
}

interface Source {
  label: string;
  url: string;
}

interface Alternative {
  id: string;
  name: string;
  tagline: string;
  intro?: string;
  category: string;
  license: string;
  deployment: string;
  website: string;
  verifiedAt: string;
  published: boolean;
  strengths: string[];
  differentiators: Differentiator[];
  whenCompetitorIsBetter: string[];
  featureMatrix: FeatureMatrixGroup[];
  faqs: Faq[];
  sources: Source[];
}

const { alternatives } = alternativesData as { alternatives: Alternative[] };

export function loader({ params }: LoaderFunctionArgs) {
  const competitor = params.competitor;

  if (!competitor) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw data({ message: "Competitor not specified" }, { status: 400 });
  }

  const alternative = alternatives.find((a) => a.id === competitor);
  if (!alternative || !alternative.published) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw data({ message: "Alternative not found" }, { status: 404 });
  }

  return { alternative };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Not Found - Dafthunk" }];

  const { alternative } = data;
  const title = `Dafthunk vs ${alternative.name}: ${alternative.tagline}`;
  const description = `${alternative.tagline}. Compare Dafthunk and ${alternative.name} on license, runtime, pricing, AI, and integrations. Last verified ${alternative.verifiedAt}.`;
  const url = `${websiteUrl}/alternatives/${alternative.id}`;
  const keywords = [
    `${alternative.name} alternative`,
    `open source ${alternative.name}`,
    `${alternative.name} vs Dafthunk`,
    "workflow automation",
    "Dafthunk",
  ].join(", ");

  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
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

interface LoaderData {
  alternative: Alternative;
}

export default function AlternativePage({
  loaderData,
}: {
  loaderData: LoaderData;
}) {
  const { alternative } = loaderData;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: websiteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Alternatives",
        item: `${websiteUrl}/alternatives`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `Dafthunk vs ${alternative.name}`,
        item: `${websiteUrl}/alternatives/${alternative.id}`,
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: alternative.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="px-6 py-32">
        <Link
          to="/alternatives"
          className="inline-flex items-center text-base text-gray-600 hover:text-gray-900 mb-12"
        >
          &larr; All alternatives
        </Link>

        <section className="mb-32" aria-label="Hero">
          <h1 className="text-7xl font-light text-gray-900 mb-10 leading-[1.1]">
            Dafthunk vs {alternative.name}
          </h1>
          <p className="text-2xl text-gray-600 leading-relaxed max-w-4xl">
            {alternative.intro ?? alternative.tagline}
          </p>
        </section>

        <section className="mb-32" aria-labelledby="strengths-heading">
          <h2
            id="strengths-heading"
            className="text-6xl font-light text-gray-900 mb-12"
          >
            What {alternative.name} does well
          </h2>
          <div className="space-y-6 max-w-4xl">
            {alternative.strengths.map((strength) => (
              <p
                key={strength}
                className="text-xl text-gray-600 leading-relaxed"
              >
                {strength}
              </p>
            ))}
          </div>
        </section>

        <section className="mb-32" aria-labelledby="differentiators-heading">
          <h2
            id="differentiators-heading"
            className="text-6xl font-light text-gray-900 mb-12"
          >
            Where Dafthunk is different
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="pb-6 pr-6 w-1/5" />
                  <th className="pb-6 px-6 text-3xl font-light text-gray-900 w-2/5">
                    Dafthunk
                  </th>
                  <th className="pb-6 pl-6 text-3xl font-light text-gray-900 w-2/5">
                    {alternative.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {alternative.differentiators.map((diff) => (
                  <tr key={diff.title} className="align-top">
                    <td className="py-6 pr-6">
                      <h3 className="text-2xl font-light text-gray-900">
                        {diff.title}
                      </h3>
                    </td>
                    <td className="py-6 px-6 text-xl text-gray-600 leading-relaxed">
                      {diff.dafthunk}
                    </td>
                    <td className="py-6 pl-6 text-xl text-gray-600 leading-relaxed">
                      {diff.competitor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-32" aria-labelledby="faq-heading">
          <h2
            id="faq-heading"
            className="text-6xl font-light text-gray-900 mb-12"
          >
            Questions people ask before switching
          </h2>
          <div className="space-y-16">
            {alternative.faqs.map((faq) => (
              <div
                key={faq.question}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16"
              >
                <div className="lg:col-span-4">
                  <h3 className="text-3xl font-light text-gray-900">
                    {faq.question}
                  </h3>
                </div>
                <div className="lg:col-span-8">
                  <p className="text-xl text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {alternative.sources.length > 0 && (
          <section className="mb-32" aria-labelledby="sources-heading">
            <h2
              id="sources-heading"
              className="text-6xl font-light text-gray-900 mb-12"
            >
              Sources
            </h2>
            <ul className="space-y-3 max-w-4xl">
              {alternative.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xl text-gray-600 hover:text-gray-900 underline underline-offset-4"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="cta-heading">
          <h2
            id="cta-heading"
            className="text-6xl font-light text-gray-900 mb-8 leading-[1.1]"
          >
            Try Dafthunk
          </h2>
          <p className="text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl">
            Build a workflow in about four minutes. Self-host on Cloudflare, or
            read the source on GitHub under MIT.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={import.meta.env.VITE_APP_URL}
              className="inline-block text-lg bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Open the editor
            </a>
            <a
              href="https://github.com/dafthunk-com/dafthunk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-lg bg-white border border-gray-300 text-gray-900 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </section>
      </main>
    </Layout>
  );
}
