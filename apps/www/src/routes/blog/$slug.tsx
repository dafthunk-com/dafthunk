import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";

import blogData from "../../../data/blog-posts.json";
import { blogPostContent } from "../../blog-posts";
import { BlogLayout } from "../../components/blog/blog-layout";

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

export function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug;

  if (!slug) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw data({ message: "Post not specified" }, { status: 400 });
  }

  const post = posts.find((p) => p.id === slug);
  if (!post || !post.published) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw data({ message: "Post not found" }, { status: 404 });
  }

  if (!blogPostContent[slug]) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw data({ message: "Post content unavailable" }, { status: 404 });
  }

  return { post };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Not Found - Dafthunk" }];

  const { post } = data;
  const title = `${post.title} - Dafthunk Blog`;
  const description = post.description;
  const url = `${websiteUrl}/blog/${post.id}`;
  const ogImage = `${websiteUrl}/og-image.webp`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "article" },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: "Dafthunk" },
    { property: "article:published_time", content: post.date },
    { property: "article:author", content: post.author },
    ...post.tags.map((tag) => ({ property: "article:tag", content: tag })),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:url", content: url },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
    { tagName: "link", rel: "canonical", href: url },
    { name: "robots", content: "index, follow" },
  ];
};

interface LoaderData {
  post: BlogPost;
}

export default function BlogPostPage({
  loaderData,
}: {
  loaderData: LoaderData;
}) {
  const { post } = loaderData;
  const content = blogPostContent[post.id];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Dafthunk",
      logo: {
        "@type": "ImageObject",
        url: `${websiteUrl}/logo-black.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${websiteUrl}/blog/${post.id}`,
    },
    keywords: post.tags.join(", "),
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
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${websiteUrl}/blog/${post.id}`,
      },
    ],
  };

  return (
    <BlogLayout meta={post}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {content}
    </BlogLayout>
  );
}
