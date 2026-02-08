import type { WorkflowTemplate } from "@dafthunk/types";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import Search from "lucide-react/icons/search";
import Wand from "lucide-react/icons/wand";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();
  const { templates, isTemplatesLoading, templatesError } = useTemplates();
  const tagCounts = useTagCounts(templates);

  useEffect(() => {
    setBreadcrumbs([{ label: "Templates" }]);
  }, [setBreadcrumbs]);

  const filteredTemplates = useMemo(() => {
    const rawSearchTerm = searchQuery.toLowerCase().trim();

    return templates
      .filter((template) => {
        const matchesTag = !selectedTag || template.tags.includes(selectedTag);
        const matchesSearch =
          !rawSearchTerm ||
          template.name.toLowerCase().includes(rawSearchTerm) ||
          template.description.toLowerCase().includes(rawSearchTerm) ||
          template.tags.some((tag) =>
            tag.toLowerCase().includes(rawSearchTerm)
          );

        return matchesTag && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, selectedTag, searchQuery]);

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
    <InsetLayout title="Templates">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tag filters */}
      {tagCounts.length > 0 && (
        <div className="mb-6">
          <TagFilterButtons
            categories={tagCounts}
            selectedTag={selectedTag}
            onTagChange={setSelectedTag}
            totalCount={templates.length}
          />
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        {filteredTemplates.length} of {templates.length} templates
      </p>

      {/* Card grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wand className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No templates found matching your search</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      className="block border rounded-lg bg-card hover:border-primary/50 transition-colors"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <DynamicIcon
            name={template.icon as any}
            className="h-5 w-5 text-blue-500 shrink-0 mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight mb-1">
              {highlightMatch(template.name, searchQuery)}
            </h3>
            <p className="text-xs text-muted-foreground">
              {template.trigger.replace("_", " ")}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {highlightMatch(template.description, searchQuery)}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {template.nodes.length} nodes
          </span>
        </div>
      </div>
    </Link>
  );
}
