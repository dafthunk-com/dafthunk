import type { MetaFunction } from "react-router";
import { Link } from "react-router";

import blogData from "../../../data/blog-posts.json";
import { Layout } from "../../components/layout";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

interface BlogPost {
  id: string;
  title: string;
  description: string;
  tagline: string;
  date: string;
  author: string;
  readingMinutes: number;
  tags: string[];
  published: boolean;
}

const { posts } = blogData as { posts: BlogPost[] };

export const meta: MetaFunction = () => {
  const title = "Blog - Dafthunk";
  const description =
    "Notes from the Dafthunk team on building agents and workflows on Cloudflare: design patterns, runtime internals, and lessons from production.";
  const url = `${websiteUrl}/blog`;
  const ogImage = `${websiteUrl}/og-image.webp`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:url", content: url },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
    { tagName: "link", rel: "canonical", href: url },
    { name: "robots", content: "index, follow" },
  ];
};

export default function BlogIndexPage() {
  const published = posts
    .filter((p) => p.published)
    .sort((a, b) => b.date.localeCompare(a.date));

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Dafthunk Blog",
    url: `${websiteUrl}/blog`,
    blogPost: published.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      author: { "@type": "Organization", name: post.author },
      url: `${websiteUrl}/blog/${post.id}`,
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
        name: "Blog",
        item: `${websiteUrl}/blog`,
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
          <h1 className="text-6xl font-light text-gray-900 mb-6">Blog</h1>
          <p className="text-3xl text-gray-500">
            Notes on building agents and workflows on Cloudflare.
          </p>
        </div>

        <div className="space-y-10 max-w-4xl">
          {published.map((post) => {
            const formattedDate = new Date(post.date).toLocaleDateString(
              "en-US",
              { year: "numeric", month: "long", day: "numeric" }
            );
            return (
              <Link
                key={post.id}
                to={`/blog/${post.id}`}
                className="group block bg-white rounded-xl p-8 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
                  <time dateTime={post.date}>{formattedDate}</time>
                  <span aria-hidden="true">·</span>
                  <span>{post.readingMinutes} min read</span>
                  {post.tags.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-3xl font-light text-gray-900 group-hover:text-black transition-colors mb-3">
                  {post.title}
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {post.tagline}
                </p>
                <span className="inline-flex items-center text-sm font-medium text-gray-900 mt-6 group-hover:underline">
                  Read post →
                </span>
              </Link>
            );
          })}
        </div>

        {published.length === 0 && (
          <p className="text-xl text-gray-500">
            New posts are on the way. Check back soon.
          </p>
        )}
      </main>
    </Layout>
  );
}
