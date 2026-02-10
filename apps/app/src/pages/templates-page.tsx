import type { WorkflowTemplate } from "@dafthunk/types";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import Wand from "lucide-react/icons/wand";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagFilterButtons } from "@/components/ui/tag-filter-buttons";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useTagCounts } from "@/hooks/use-tag-counts";
import { useTemplates } from "@/services/template-service";

function highlightMatch(text: string, searchTerm: string) {
  if (!searchTerm.trim()) return text;

  const words = searchTerm
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter((word) => word.length > 0);

  if (words.length === 0) return text;

  const regex = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (words.some((word) => new RegExp(`^${word}$`, "i").test(part))) {
      return (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-900 font-semibold"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

export function TemplatesPage() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();
  const { templates, isTemplatesLoading, templatesError } = useTemplates();

  useEffect(() => {
    setBreadcrumbs([{ label: "Templates" }]);
  }, [setBreadcrumbs]);

  // Filter by search term
  const searchFilteredTemplates = useMemo(() => {
    const rawSearchTerm = searchQuery.toLowerCase().trim();
    if (!rawSearchTerm) return templates;
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(rawSearchTerm) ||
        template.description.toLowerCase().includes(rawSearchTerm) ||
        template.tags.some((tag) => tag.toLowerCase().includes(rawSearchTerm))
    );
  }, [templates, searchQuery]);

  // Filter by selected tags (all must match)
  const filteredTemplates = useMemo(() => {
    const sorted = searchFilteredTemplates.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    if (selectedTags.length === 0) return sorted;
    return sorted.filter((t) =>
      selectedTags.every((tag) => t.tags.includes(tag))
    );
  }, [searchFilteredTemplates, selectedTags]);

  // Tag counts for the filter buttons
  const overallTagCounts = useTagCounts(searchFilteredTemplates);
  const filteredTagCounts = useTagCounts(filteredTemplates);
  const tagCounts = filteredTagCounts.slice(0, 20).map(({ tag }) => {
    const overallCount =
      overallTagCounts.find((tc) => tc.tag === tag)?.count ?? 0;
    return { tag, count: overallCount };
  });
  const selectedTagCounts = overallTagCounts
    .filter((tc) => selectedTags.includes(tc.tag))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    });

  const handleTagChange = (tag: string | null) => {
    if (tag === null) {
      setSelectedTags([]);
    } else if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  if (isTemplatesLoading) {
    return <InsetLoading title="Templates" />;
  }

  if (templatesError) {
    return (
      <InsetError
        title="Templates"
        errorMessage={templatesError.message || "Failed to load templates"}
      />
    );
  }

  return (
    <InsetLayout
      title="Templates"
      childrenClassName="flex flex-col h-[calc(100%-theme(spacing.12))]"
    >
      <div className="flex flex-col gap-4 min-h-0 h-full">
        {/* Search */}
        <div className="relative shrink-0">
          <Input
            placeholder="Search templates..."
            className="pl-4 text-base h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Card grid */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wand className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    No templates found matching your search
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      searchQuery={searchQuery}
                      href={getOrgUrl(`templates/${template.id}`)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Tag filter sidebar */}
          {tagCounts.length > 0 && (
            <div className="w-72 shrink-0">
              <TagFilterButtons
                categories={tagCounts}
                selectedTags={selectedTags}
                selectedTagCounts={selectedTagCounts}
                onTagChange={handleTagChange}
                totalCount={searchFilteredTemplates.length}
              />
              <div className="text-xs text-muted-foreground/60 pt-3 text-right">
                {filteredTemplates.length} of {templates.length} templates
              </div>
            </div>
          )}
        </div>
      </div>
    </InsetLayout>
  );
}

function TemplateCard({
  template,
  searchQuery,
  href,
}: {
  template: WorkflowTemplate;
  searchQuery: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="block border rounded-lg bg-card border-border hover:border-primary/50 transition-colors"
    >
      <div className="grid grid-cols-[1fr_auto] gap-6 p-4">
        <div className="flex items-start gap-4 min-w-0">
          <DynamicIcon
            name={template.icon as any}
            className="h-5 w-5 text-blue-500 shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight mb-1">
              {highlightMatch(template.name, searchQuery)}
            </h3>
            {template.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {highlightMatch(template.description, searchQuery)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-start pt-0.5">
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
