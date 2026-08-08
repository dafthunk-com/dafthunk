import type { NodeType } from "@dafthunk/types";

import { pseudoNodeTypes } from "./ai-nodes";
import { MAX_CANDIDATE_NODE_TYPES, WITHHELD_RELEVANCE_RATIO } from "./config";
import { CORE_NODE_TYPES } from "./core-nodes";
import type { Ineligible } from "./eligibility";
import { filterEligible } from "./eligibility";
import { scoreNodeTypes } from "./node-search";

/**
 * Which node types the model is allowed to see.
 *
 * The stage nothing downstream can recover from. A type absent from the catalog
 * is a type the model cannot use however well it reasons — it will either
 * invent one (costing a repair round) or build the request out of something
 * that does not fit. Every later stage is measured against a graph this stage
 * already bounded.
 *
 * Deliberately deterministic and free of model calls, which is what lets it be
 * asserted against real requests in the unit suite — see
 * `catalog-selection.test.ts`. It is the only stage of the pipeline with that
 * property.
 */

export interface CandidateSelection {
  candidates: NodeType[];
  withheld: Ineligible[];
}

/**
 * Selects the node types shown to the model: keyword-ranked matches, plus a
 * guaranteed floor of glue and output nodes, plus the curated AI stand-ins.
 */
export function selectCandidates(
  query: string,
  nodeTypes: NodeType[],
  connectedProviders: ReadonlySet<string>,
  /**
   * Node types that realize the promised destination.
   *
   * Forced into the catalog rather than left to keyword luck. The prompt tells
   * the model which type to deliver with, but a type it cannot see the ports of
   * is a type it has to guess at — and the destination is very often something
   * the request never mentioned (an unstated "email it to me" is the whole
   * reason the brief exists), so it scores nothing and would be cut.
   */
  required: readonly string[] = [],
  /** Resource types the org owns that may be bound without review. */
  bindable: ReadonlySet<string> = new Set()
): CandidateSelection {
  const withPseudo = [...nodeTypes, ...pseudoNodeTypes()];
  const { eligible, byType, withheld } = filterEligible(withPseudo, {
    connectedProviders,
    bindableResources: bindable,
  });

  /**
   * Which unusable nodes the request was actually reaching for.
   *
   * "Scored at all" is too loose a test: "post a slack message" shares the
   * token "post" with every blogging node, which would announce WordPress to
   * someone who never mentioned it. The question worth answering is whether
   * the node would have been *offered to the model* had it been usable — so
   * everything is ranked together and the same cut applied.
   *
   * Known wart, left as it was found: this ranking and the one below use
   * different corpora, so IDF differs between them and the relevance threshold
   * is measured on a slightly different scale than the selection it is
   * compared against. Collapsing them into one pass changes which types get
   * offered, and that is a retrieval-quality change that wants measuring
   * rather than guessing — it is deferred until the pipeline trace can report
   * what selection actually did.
   */
  const withheldByType = new Map(withheld.map((entry) => [entry.type, entry]));
  const allRanked = scoreNodeTypes(
    query,
    withPseudo.filter((nodeType) => !nodeType.trigger && !nodeType.responder)
  );
  const topScore = allRanked[0]?.score ?? 0;

  for (const scored of allRanked) {
    if (scored.score < topScore * WITHHELD_RELEVANCE_RATIO) break;
    const entry = withheldByType.get(scored.nodeType.type);
    if (entry) entry.relevant = true;
  }

  const ranked = scoreNodeTypes(query, eligible)
    .slice(0, MAX_CANDIDATE_NODE_TYPES)
    .map((scored) => scored.nodeType);

  const chosen = new Map(ranked.map((nt) => [nt.type, nt]));
  for (const type of [...required, ...CORE_NODE_TYPES]) {
    if (chosen.has(type)) continue;
    const nodeType = byType.get(type);
    if (nodeType) chosen.set(type, nodeType);
  }

  return { candidates: [...chosen.values()], withheld };
}
