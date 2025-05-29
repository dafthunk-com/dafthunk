import { MDXProvider } from "@mdx-js/react";
import { Check, Copy, ExternalLink } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";

// Helper function to extract text content from React children
function getTextContent(children: React.ReactNode): string {
  if (typeof children === "string") {
    return children;
  }

  if (typeof children === "number") {
    return children.toString();
  }

  if (React.isValidElement(children)) {
    return getTextContent(
      (children.props as { children?: React.ReactNode }).children
    );
  }

  if (Array.isArray(children)) {
    return children.map(getTextContent).join("");
  }

  return "";
}

// Helper function to generate heading IDs
function generateHeadingId(children: React.ReactNode): string {
  const text = getTextContent(children);
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens and spaces
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const isInline = !className;

  if (isInline) {
    return (
      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(children));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="relative group">
      <pre className="mb-4 mt-6 overflow-x-auto rounded-lg border bg-zinc-950 text-white p-4">
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-transparent"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <code className={cn("text-sm", className)}>{children}</code>
      </pre>
    </div>
  );
}

interface CalloutProps {
  children: React.ReactNode;
  type?: "note" | "warning" | "tip" | "danger";
}

function Callout({ children, type = "note" }: CalloutProps) {
  const variants = {
    note: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
    warning:
      "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
    tip: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
    danger:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  };

  return (
    <div className={cn("border-l-4 p-4 my-6 rounded-r-lg", variants[type])}>
      {children}
    </div>
  );
}

const components = {
  // Headings with anchor links and improved styling
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = generateHeadingId(children);
    return (
      <h1
        id={id}
        className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-8 mt-10 first:mt-0"
        {...props}
      >
        {children}
      </h1>
    );
  },
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = generateHeadingId(children);
    return (
      <h2
        id={id}
        className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mt-10 mb-6 first:mt-0"
        {...props}
      >
        {children}
      </h2>
    );
  },
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = generateHeadingId(children);
    return (
      <h3
        id={id}
        className="scroll-m-20 text-2xl font-semibold tracking-tight mt-8 mb-4"
        {...props}
      >
        {children}
      </h3>
    );
  },
  h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = generateHeadingId(children);
    return (
      <h4
        id={id}
        className="scroll-m-20 text-xl font-semibold tracking-tight mt-6 mb-3"
        {...props}
      >
        {children}
      </h4>
    );
  },
  h5: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = generateHeadingId(children);
    return (
      <h5
        id={id}
        className="scroll-m-20 text-lg font-semibold tracking-tight mt-4 mb-2 text-muted-foreground"
        {...props}
      >
        {children}
      </h5>
    );
  },
  h6: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = generateHeadingId(children);
    return (
      <h6
        id={id}
        className="scroll-m-20 text-base font-semibold tracking-tight mt-4 mb-2 text-muted-foreground"
        {...props}
      >
        {children}
      </h6>
    );
  },

  // Paragraphs
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
    const hasChildren = React.Children.count(children) > 0;
    if (hasChildren) {
      return children;
    }

    return (
      <p className="leading-7 [&:not(:first-child)]:mt-6" {...props}>
        {children}
      </p>
    );
  },

  // Lists
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-7" {...props}>
      {children}
    </li>
  ),

  // Links
  a: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isExternal = href?.startsWith("http");
    const Component = isExternal ? "a" : Link;

    return (
      <Component
        className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 inline-flex items-center gap-1"
        href={isExternal ? href : undefined}
        to={isExternal ? (href ?? "") : ""}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
        {isExternal && <ExternalLink className="h-3 w-3" />}
      </Component>
    );
  },

  // Code blocks and inline code
  code: CodeBlock,
  pre: ({ children }: { children: React.ReactNode }) => <>{children}</>,

  // Blockquotes
  blockquote: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="mt-6 border-l-2 pl-6 italic text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Tables
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 w-full overflow-y-auto">
      <table className="w-full border-collapse border-spacing-0" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="border-b" {...props}>
      {children}
    </thead>
  ),
  tbody: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="border-b transition-colors hover:bg-muted/50" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="h-12 px-4 text-left align-middle font-medium" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="p-4 align-middle text-muted-foreground" {...props}>
      {children}
    </td>
  ),

  // Images
  img: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img
      className="rounded-lg border max-w-full h-auto my-6"
      alt={alt}
      {...props}
    />
  ),

  // Horizontal rule
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-8 border-muted" {...props} />
  ),

  // Strong and emphasis
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),

  // Custom components
  Callout,
  Badge,
};

interface MdxProviderProps {
  children: React.ReactNode;
}

export function MdxProvider({ children }: MdxProviderProps) {
  return <MDXProvider components={components}>{children}</MDXProvider>;
}
