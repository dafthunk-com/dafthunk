import { describe, expect, it } from "vitest";

import { describeTemplateStructure } from "./template-test-utils";
import { wikiResearchAgentTemplate as t } from "./wiki-research-agent";

describeTemplateStructure("Wiki Research Agent template", t);

describe("Wiki Research Agent template", () => {
  it("agent tool refs are well-formed", () => {
    const agent = t.nodes.find((n) => n.id === "agent");
    const tools = agent?.inputs.find((i) => i.name === "tools");
    const refs = tools?.value as
      | Array<{ type: string; identifier: string }>
      | undefined;
    expect(refs?.length).toBeGreaterThan(0);
    for (const ref of refs ?? []) {
      expect(ref.type).toBe("node");
      expect(typeof ref.identifier).toBe("string");
      expect(ref.identifier.length).toBeGreaterThan(0);
    }
  });
});
