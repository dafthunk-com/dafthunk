import type { Field } from "@dafthunk/types";
import {
  RESOURCE_FAMILY_NOUNS,
  type ResolvedResourceBinding,
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
 * repair rounds re-emit the draft: creations are cached by family and
 * normalized name, so a re-emitted "create" reuses the row instead of
 * multiplying it.
 */

export type CreateResourceFn = (
  type: OrgResourceType,
  spec: { name: string; description?: string; fields?: Field[] }
) => Promise<OrgResource>;

export interface ResourceResolution {
  /** One instance per family, ready for hydration to bind. */
  bindings: Partial<Record<OrgResourceType, OrgResource>>;
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
    resolution: ResourceResolution
  ): Promise<OrgResource | undefined> => {
    if (!options?.create) return undefined;
    const key = `${family}:${normalizeName(spec.name)}`;
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

  const resolve = async (
    requested?: DraftResource[]
  ): Promise<ResourceResolution> => {
    const resolution: ResourceResolution = {
      bindings: {},
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
      // One binding per family; the first request (or the brief) wins.
      if (resolution.bindings[family]) continue;

      const creatable =
        CREATABLE_RESOURCE_TYPES.has(family) && Boolean(options?.create);
      // A schema without fields validates nothing and structures nothing —
      // there is no meaningful row to create.
      const canCreate =
        creatable && (family !== "schema" || (entry.fields?.length ?? 0) > 0);
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
                  ...(entry.fields?.length ? { fields: entry.fields } : {}),
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
      if (family === "schema") continue; // no fields to give it
      if (!CREATABLE_RESOURCE_TYPES.has(family)) continue;
      const resource = await createOnce(family, { name }, resolution);
      if (resource) resolution.bindings[family] = resource;
    }

    return resolution;
  };

  return { resolve };
}
