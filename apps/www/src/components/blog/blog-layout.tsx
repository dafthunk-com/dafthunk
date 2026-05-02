import type { ReactNode } from "react";
import { Link } from "react-router";

import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";

interface BlogPostMeta {
  title: string;
  description: string;
  date: string;
  author: string;
  readingMinutes: number;
  tags: string[];
}

interface BlogLayoutProps {
  meta: BlogPostMeta;
  children: ReactNode;
}

export function BlogLayout({ meta, children }: BlogLayoutProps) {
  const formattedDate = new Date(meta.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-neutral-50 bg-dot-grid flex flex-col overflow-x-clip">
      <SiteHeader />
      <div className="flex-1 max-w-(--breakpoint-lg) mx-auto w-full px-6 pt-24 pb-32">
        <Link
          to="/blog"
          className="inline-flex items-center text-base text-gray-600 hover:text-gray-900 mb-12"
        >
          &larr; All posts
        </Link>

        <header className="mb-16">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-6">
            <time dateTime={meta.date}>{formattedDate}</time>
            <span aria-hidden="true">·</span>
            <span>{meta.author}</span>
            <span aria-hidden="true">·</span>
            <span>{meta.readingMinutes} min read</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-light text-gray-900 leading-[1.1] mb-6">
            {meta.title}
          </h1>
          <p className="text-2xl text-gray-600 leading-relaxed">
            {meta.description}
          </p>
          {meta.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8">
              {meta.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <article className="prose prose-gray prose-lg max-w-none prose-headings:font-light prose-headings:text-gray-900 prose-h2:text-4xl prose-h2:mt-16 prose-h2:mb-6 prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-gray-900 prose-a:underline hover:prose-a:text-black prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:bg-white prose-pre:border prose-pre:border-gray-200 prose-pre:text-gray-900 prose-pre:rounded-lg prose-strong:text-gray-900 prose-strong:font-medium">
          {children}
        </article>
      </div>
      <SiteFooter />
    </div>
  );
}
