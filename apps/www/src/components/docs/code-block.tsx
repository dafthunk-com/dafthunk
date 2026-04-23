import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "../../lib/utils";

interface CodeBlockProps {
  html: string;
  raw: string;
  className?: string;
}

export function CodeBlock({ html, raw, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — clipboard may be unavailable
    }
  };

  return (
    <div
      className={cn(
        "not-prose relative group rounded-lg border border-gray-200 bg-white overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-900 transition-opacity"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <div
        className="text-sm overflow-x-auto [&_pre]:m-0! [&_pre]:p-4 [&_pre]:bg-transparent!"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
