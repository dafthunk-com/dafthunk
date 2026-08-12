import type { Field } from "@dafthunk/types";
import {
  RESOURCE_FAMILY_NOUNS,
  type ResolvedResourceBinding,
  schemaShapeKey,
  toSchemaName,
} from "@dafthunk/utils";

import type { DraftResource } from "./draft-types";
import type {
  OrgResource,
  OrgResources,
  OrgResourceType,
} from "./org-resources";
import { CREATABLE_RESOURCE_TYPES, resourceToBind } from "./org-resources";

/**
 * Turns what the model asked for into resources that exist.
 *
 * The prompt tells the model to reuse components by name and to propose
 * creating what is missing; this is the code that makes those words true
 * whatever comes back. Same division of labour as `normalizeBrief`: a prompt
 * is a request, the resolver is the guarantee.
 *
 * Constructed once per pipeline run and consulted on every attempt, because
 * repair rounds re-emit the draft: creations are cached, so a re-emitted
 * "create" reuses the row instead of multiplying it.
 *
 * Schemas are the exception to nearly everything here, and `resolveSchema`
 * says why: every other family is a place to be found, a schema is a shape to
 * be written down.
 */

export type CreateResourceFn = (
  type: OrgResourceType,
  spec: { name: string; description?: string; fields?: Field[] }
) => Promise<OrgResource>;

export interface ResourceResolution {
  /** One instance per family, ready for hydration to bind. */
  bindings: Partial<Record<OrgResourceType, OrgResource>>;
  /**
   * Schemas by node id, because a shape belongs to a node rather than to a
   * workflow. `bindings.schema` survives alongside this as the fallback for
   * nodes the draft gave no shape of their own — that is where a schema the
   * user picked in the brief lands.
   */
  schemasByNode: Map<string, OrgResource>;
  /** Rows brought into being by THIS resolve call. */
  created: Array<{ type: OrgResourceType; resource: OrgResource }>;
  /** User-facing lines about what was created, for the log frames. */
  notes: string[];
}

const VALID_FAMILIES = new Set<string>(Object.keys(RESOURCE_FAMILY_NOUNS));

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function findByName(
  owned: OrgResource[],
  name: string
): OrgResource | undefined {
  const needle = normalizeName(name);
  return (
    owned.find((resource) => normalizeName(resource.name) === needle) ??
    owned.find((resource) => normalizeName(resource.name).includes(needle))
  );
}

/** How a schema name compares, so creation and matching agree on one form. */
function normalizeSchemaName(name: string): string {
  return toSchemaName(name).toLowerCase();
}

export function createResourceResolver(
  orgResources: OrgResources,
  options?: {
    create?: CreateResourceFn;
    /**
     * What the brief's grounded blanks settled on. The user saw and accepted
     * these, so they win over whatever the draft proposes for the family.
     */
    briefBindings?: ResolvedResourceBinding[];
  }
): { resolve(requested?: DraftResource[]): Promise<ResourceResolution> } {
  /** Created rows, by family + normalized name, surviving across attempts. */
  const createdCache = new Map<string, OrgResource>();

  const ownedAndCreated = (family: OrgResourceType): OrgResource[] => [
    ...(orgResources[family] ?? []),
    ...[...createdCache.entries()]
      .filter(([key]) => key.startsWith(`${family}:`))
      .map(([, resource]) => resource),
  ];

  const createOnce = async (
    family: OrgResourceType,
    spec: { name: string; description?: string; fields?: Field[] },
    resolution: ResourceResolution,
    /**
     * What makes two requests the same request. Names, for a place: asking
     * twice for the "Leads" database means one database. For a schema it is
     * the shape, because the model renames the same record between repair
     * rounds far more readily than it reshapes it.
     */
    cacheKey = `${family}:${normalizeName(spec.name)}`
  ): Promise<OrgResource | undefined> => {
    if (!options?.create) return undefined;
    const key = cacheKey;
    const cached = createdCache.get(key);
    if (cached) return cached;

    // A failed creation degrades to an unbound input plus the existing
    // missing-resource note — never to a failed generation. The workflow is
    // still worth saving; the resource is a thing the user can add.
    let resource: OrgResource;
    try {
      resource = await options.create(family, spec);
    } catch (error) {
      console.warn(
        `[WorkflowGenerator] could not create ${family} "${spec.name}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    }
    createdCache.set(key, resource);
    resolution.created.push({ type: family, resource });
    resolution.notes.push(
      `Created the ${RESOURCE_FAMILY_NOUNS[family]} "${resource.name}" — it's yours now, and you can change or delete it like any other.`
    );
    return resource;
  };

  /**
   * A schema for one declared shape: the workspace's own if it already has
   * this exact shape under this name, a new row otherwise.
   *
   * Both halves of that test earn their place. The shape decides whether reuse
   * is *safe* — the fields become the node's ports, so an unequal shape is a
   * silently miswired graph. The name decides whether reuse is *what the user
   * meant* — the schema is what they will see on their form and in their
   * Schemas list, and an identical shape filed under someone else's word for
   * it is a workflow that reads as being about something else.
   */
  const resolveSchema = async (
    entry: DraftResource,
    resolution: ResourceResolution
  ): Promise<OrgResource | undefined> => {
    const fields = entry.fields?.length ? entry.fields : undefined;
    // A schema without fields validates nothing and structures nothing —
    // there is no meaningful row, and nothing to compare against one.
    if (!fields) return undefined;

    const shape = schemaShapeKey(fields);
    const wanted = normalizeSchemaName(entry.name);
    const owned = ownedAndCreated("schema");

    const match = owned.find(
      (resource) =>
        resource.fields?.length &&
        schemaShapeKey(resource.fields) === shape &&
        normalizeSchemaName(resource.name) === wanted
    );
    if (match) return match;

    // The name is taken by a different shape. Reusing it would rewire a node
    // to the wrong fields and renaming their row would be worse, so the new
    // shape gets a name of its own.
    let name = toSchemaName(entry.name);
    if (
      owned.some((resource) => normalizeSchemaName(resource.name) === wanted)
    ) {
      let suffix = 2;
      while (
        owned.some(
          (resource) =>
            normalizeSchemaName(resource.name) ===
            normalizeSchemaName(`${name}_${suffix}`)
        )
      ) {
        suffix += 1;
      }
      name = `${name}_${suffix}`;
    }

    return createOnce(
      "schema",
      {
        name,
        ...(entry.description ? { description: entry.description } : {}),
        fields,
      },
      resolution,
      `schema:${shape}`
    );
  };

  const resolve = async (
    requested?: DraftResource[]
  ): Promise<ResourceResolution> => {
    const resolution: ResourceResolution = {
      bindings: {},
      schemasByNode: new Map(),
      created: [],
      notes: [],
    };

    // Families the brief committed to creating, awaiting a name and purpose
    // from the draft — the model knows what the thing is for; the blank only
    // knew that it was new. The value is the words the user accepted.
    const pendingCreate = new Map<OrgResourceType, string>();

    for (const entry of options?.briefBindings ?? []) {
      const bound = entry.binding;
      if (bound.kind === "existing") {
        const owned = ownedAndCreated(entry.family).find(
          (resource) => resource.id === bound.resourceId
        );
        if (owned) resolution.bindings[entry.family] = owned;
      } else {
        pendingCreate.set(entry.family, bound.name);
      }
    }

    for (const entry of Array.isArray(requested) ? requested : []) {
      if (!entry || typeof entry !== "object") continue;
      const family = entry.family as OrgResourceType;
      if (!VALID_FAMILIES.has(family)) continue;
      if (typeof entry.name !== "string" || !entry.name.trim()) continue;

      /**
       * Schemas resolve per node and by shape, so none of what follows applies
       * to them: not the one-per-family guard, not the name fallbacks, and not
       * `resourceToBind`. Binding the workspace's oldest schema to a node is
       * never a good guess — its fields become that node's ports.
       */
      if (family === "schema") {
        const nodeId =
          typeof entry.nodeId === "string" ? entry.nodeId.trim() : "";
        if (nodeId && resolution.schemasByNode.has(nodeId)) continue;
        const resource = await resolveSchema(entry, resolution);
        if (!resource) continue;
        if (nodeId) {
          resolution.schemasByNode.set(nodeId, resource);
        } else {
          // No node named: the shape stands for the workflow, the way it did
          // before schemas were per-node. Still never overrides the brief.
          resolution.bindings.schema ??= resource;
        }
        pendingCreate.delete(family);
        continue;
      }

      // One binding per family; the first request (or the brief) wins.
      if (resolution.bindings[family]) continue;

      const canCreate =
        CREATABLE_RESOURCE_TYPES.has(family) && Boolean(options?.create);
      const wantsCreate =
        entry.action === "create" || pendingCreate.has(family);

      const owned = ownedAndCreated(family);
      const named = findByName(owned, entry.name);

      if (wantsCreate) {
        // A same-named resource already existing turns the create into reuse:
        // the intent was "have one of these", not "have two".
        const resource =
          named ??
          (canCreate
            ? await createOnce(
                family,
                {
                  name: entry.name.trim(),
                  ...(entry.description
                    ? { description: entry.description }
                    : {}),
                },
                resolution
              )
            : undefined);
        if (resource) resolution.bindings[family] = resource;
        pendingCreate.delete(family);
        continue;
      }

      // action "use": name match first, then the deterministic oldest. When
      // the org owns none at all and the family is creatable, creating what
      // was asked for beats saving a workflow with a hole in it.
      const resource =
        named ??
        resourceToBind(orgResources, family) ??
        (canCreate
          ? await createOnce(family, { name: entry.name.trim() }, resolution)
          : undefined);
      if (resource) resolution.bindings[family] = resource;
    }

    // Brief-level creations the draft never mentioned: create them under the
    // words the user accepted — better a plainly named row than a broken bind.
    for (const [family, name] of pendingCreate) {
      if (resolution.bindings[family]) continue;
      // A schema is its fields, and a blank only carried a name. The shapes
      // the graph needs are recovered from the graph instead.
      if (family === "schema") continue;
      if (!CREATABLE_RESOURCE_TYPES.has(family)) continue;
      const resource = await createOnce(family, { name }, resolution);
      if (resource) resolution.bindings[family] = resource;
    }

    return resolution;
  };

  return { resolve };
}
