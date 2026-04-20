import type { CloudflareModelInfo } from "@dafthunk/types";
import { Wand } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic.mjs";
import { useMemo, useState } from "react";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagFilterButtons } from "@/components/ui/tag-filter-buttons";
import { makeRequest } from "@/services/utils";
import { highlightMatch } from "@/utils/text-highlight";
import { cn } from "@/utils/utils";

import { shortName } from "./cloudflare-model-utils";

interface CloudflareModelDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (model: CloudflareModelInfo) => void;
  currentModel?: string;
}

interface TaggedModel {
  info: CloudflareModelInfo;
  /** The model's primary task category (e.g. "Translation"). Null if CF didn't tag it. */
  task: string | null;
  /** Display-only provider name derived from the model identifier. */
  provider: string;
}

/** Map a Cloudflare task name to a Lucide icon. Falls back to `bot`. */
const TASK_ICONS: Record<string, IconName> = {
  "Text Generation": "message-square",
  "Text-to-Image": "image",
  "Image-to-Text": "scan-text",
  "Image-to-Image": "images",
  "Text-to-Speech": "volume-2",
  "Automatic Speech Recognition": "mic",
  Translation: "languages",
  "Text Classification": "tags",
  "Image Classification": "tag",
  "Object Detection": "scan-search",
  "Text Embeddings": "vector-square",
  Summarization: "align-left",
};

/**
 * Extract the provider segment from a model identifier.
 * `@cf/meta/llama-3.2-3b-instruct` → `Meta`.
 */
function providerFromId(id: string): string {
  const match = id.match(/^@[a-z]+\/([^/]+)\//i);
  if (!match) return "Unknown";
  return match[1]
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function matchesSearch(model: TaggedModel, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return (
    model.info.name.toLowerCase().includes(needle) ||
    model.info.description?.toLowerCase().includes(needle) === true ||
    model.task?.toLowerCase().includes(needle) === true ||
    model.provider.toLowerCase().includes(needle)
  );
}

export function CloudflareModelDialog({
  open,
  onClose,
  onSelect,
  currentModel,
}: CloudflareModelDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const { data, error } = useSWR<{ models: CloudflareModelInfo[] }>(
    open ? "/cloudflare-ai/models?per_page=200" : null,
    (url: string) => makeRequest(url),
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 }
  );

  const models: TaggedModel[] = useMemo(() => {
    if (!data?.models) return [];
    return data.models.map((info) => ({
      info,
      task: info.task?.name ?? null,
      provider: providerFromId(info.name),
    }));
  }, [data]);

  const searchResults = useMemo(
    () => models.filter((m) => matchesSearch(m, searchTerm)),
    [models, searchTerm]
  );

  // The filter sidebar only acts on task — providers are too scattered to
  // make useful filter buckets (one model per provider in most cases) and
  // would crowd out low-count-but-important tasks like Translation.
  const filteredModels = useMemo(() => {
    if (selectedTasks.length === 0) return searchResults;
    return searchResults.filter(
      (m) => m.task !== null && selectedTasks.includes(m.task)
    );
  }, [searchResults, selectedTasks]);

  // Count tasks across the current search scope so the sidebar reflects what
  // the user is looking at. Show every task — the catalog has ~12 of them so
  // there's no need to cap the list.
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of searchResults) {
      if (m.task) counts[m.task] = (counts[m.task] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) =>
        b.count !== a.count ? b.count - a.count : a.tag.localeCompare(b.tag)
      );
  }, [searchResults]);

  const selectedTaskCounts = taskCounts.filter((tc) =>
    selectedTasks.includes(tc.tag)
  );

  const handleTaskChange = (tag: string | null) => {
    if (tag === null) {
      setSelectedTasks([]);
    } else if (selectedTasks.includes(tag)) {
      setSelectedTasks(selectedTasks.filter((t) => t !== tag));
    } else {
      setSelectedTasks([...selectedTasks, tag]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[80vw] h-[80vh] max-w-[1400px] flex flex-col p-0">
        <DialogTitle className="sr-only">Select a Cloudflare model</DialogTitle>
        <div className="relative px-4 pt-4">
          <Wand className="absolute left-8 top-9 h-6 w-6 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            className="pl-14 text-xl h-16 border rounded-lg bg-accent border-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 flex gap-2 px-4 pb-4 min-h-0">
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {error && (
                <div className="text-center py-12 text-destructive text-sm">
                  Failed to load catalog: {error.message}
                </div>
              )}
              {!data && !error && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Loading catalog…
                </div>
              )}
              {filteredModels.map((model) => {
                const taskIcon =
                  (model.info.task?.name && TASK_ICONS[model.info.task.name]) ||
                  "bot";
                const isCurrent = model.info.name === currentModel;
                return (
                  <button
                    type="button"
                    key={model.info.id}
                    onClick={() => {
                      onSelect(model.info);
                      onClose();
                    }}
                    className={cn(
                      "w-full text-left border rounded-lg cursor-pointer bg-card",
                      "hover:border-primary/50 transition-colors",
                      isCurrent && "border-primary"
                    )}
                  >
                    <div className="flex items-start gap-4 p-4 min-w-0">
                      <DynamicIcon
                        name={taskIcon}
                        className="h-5 w-5 shrink-0 mt-0.5 text-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base leading-tight mb-1 flex flex-wrap items-baseline gap-x-2">
                          <span className="font-mono break-all">
                            {highlightMatch(
                              shortName(model.info.name),
                              searchTerm
                            )}
                          </span>
                          <span className="font-mono text-xs font-normal text-muted-foreground break-all">
                            {highlightMatch(model.info.name, searchTerm)}
                          </span>
                        </h3>
                        {model.info.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                            {highlightMatch(model.info.description, searchTerm)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {model.task && (
                            <Badge variant="secondary" className="text-xs">
                              {model.task}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {model.provider}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {data && filteredModels.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No models match your search</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {taskCounts.length > 0 && (
            <div className="w-80 shrink-0 flex flex-col">
              <div className="sticky top-0 flex-1">
                <TagFilterButtons
                  categories={taskCounts}
                  selectedTags={selectedTasks}
                  selectedTagCounts={selectedTaskCounts}
                  onTagChange={handleTaskChange}
                  totalCount={searchResults.length}
                />
              </div>
              <div className="text-xs text-muted-foreground/60 pt-4 text-right">
                {filteredModels.length} of {models.length} models
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
