import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { shikiHighlightCode } from "@/utils/shiki";
import { cn } from "@/utils/utils";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  language?: string;
}

export function CodeBlock({ children, className, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const isInline = !className && !language;

  const codeString = String(children);

  useEffect(() => {
    const highlightCode = async () => {
      if (isInline || !codeString.trim()) {
        return;
      }

      setIsLoading(true);
      try {
        // Extract language from className if not provided directly
        const lang = language || className?.replace("language-", "") || "text";

        const html = await shikiHighlightCode(codeString, lang);

        setHighlightedCode(html);
      } catch (error) {
        console.warn("Failed to highlight code:", error);
        // Fallback to plain text if highlighting fails
        setHighlightedCode(`<pre><code>${codeString}</code></pre>`);
      } finally {
        setIsLoading(false);
      }
    };

    highlightCode();
  }, [codeString, language, className, isInline]);

  if (isInline) {
    return (
      <code
        className={cn(
          "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
          className
        )}
      >
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (isLoading) {
    return (
      <div className="relative group">
        <pre
          className={cn(
            "mb-4 mt-6 overflow-x-auto rounded-lg border bg-zinc-950 text-white p-4",
            className
          )}
        >
          <div className="flex items-center justify-center h-20">
            <div className="text-zinc-400 text-sm">
              Loading syntax highlighting...
            </div>
          </div>
        </pre>
      </div>
    );
  }

  return (
    <div className="relative group">
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-transparent z-10"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <div
        className={cn(
          "mb-4 mt-2 overflow-x-auto rounded-md text-sm [&_pre]:m-0 [&_pre]:p-4 [&_pre]:!bg-secondary [&_pre]:dark:!bg-neutral-900 [&_code]:whitespace-pre-wrap",
          className
        )}
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    </div>
  );
}
