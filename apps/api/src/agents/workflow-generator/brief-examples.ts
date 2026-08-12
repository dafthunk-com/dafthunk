import type { NodeType } from "@dafthunk/types";
import { BRIEF_EXAMPLES } from "@dafthunk/utils";

import { scoreNodeTypes } from "./node-search";

/**
 * The examples closest to the request, best first, or none when nothing scores.
 *
 * The list itself lives in `@dafthunk/utils`, because the first screen offers
 * the same sentences and cannot import from here. Ranking stays: it needs the
 * catalog's scorer, which is server-side.
 *
 * Scored through `scoreNodeTypes` by projecting each example into the shape it
 * takes — the same trick `rankExamples` uses for templates. Reusing the one
 * scorer means an example is matched by the same IDF weighting the catalog
 * uses, rather than by a second, subtly different notion of relevance.
 */
export function rankBriefExamples(query: string, limit: number): string[] {
  if (limit <= 0) return [];

  const asNodeTypes: NodeType[] = BRIEF_EXAMPLES.map((example) => ({
    id: example.id,
    name: example.id,
    type: example.id,
    description: example.prompt,
    tags: example.keywords,
    icon: "sparkles",
    inputs: [],
    outputs: [],
  }));

  return scoreNodeTypes(query, asNodeTypes)
    .slice(0, limit)
    .map(
      (scored) =>
        BRIEF_EXAMPLES.find((example) => example.id === scored.nodeType.type)
          ?.prompt
    )
    .filter((prompt): prompt is string => prompt !== undefined);
}
