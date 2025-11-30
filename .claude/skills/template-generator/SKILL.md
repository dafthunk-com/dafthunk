---
name: template-generator
description: Generate workflow templates with coherent node graphs and integration tests
---

# Template Generator Skill

Generate workflow templates: discover nodes, design graphs, wire edges correctly, create tests.

## Runtime Essentials

- **Topological execution**: Nodes run in dependency order (edges define order)
- **Data flows through edges**: `sourceOutput` → `targetInput` (port names must match exactly)
- **Skipping**: If all upstream edges fail/skip, downstream nodes skip (not an error)
- **No cycles**: Runtime rejects circular dependencies

## Discover Nodes

**Directory structure:**
```
apps/api/src/nodes/
├── input/      # TextInputNode, ImageInputNode, NumberInputNode...
├── preview/    # TextPreviewNode, ImagePreviewNode, NumberPreviewNode...
├── text/       # Summarization, translation, sentiment
├── image/      # Generation, manipulation
├── audio/      # Processing, transcription
├── anthropic/  # Claude models
├── openai/     # GPT models
├── logic/      # ConditionalForkNode, ConditionalJoinNode
└── ...         # json/, math/, fetch/, browser/, etc.
```

**Search commands:**
```bash
Grep pattern="translate" path="apps/api/src/nodes" glob="*.ts"
Glob pattern="apps/api/src/nodes/text/*.ts"
```

**Read node interface** - look for `nodeType.inputs` and `nodeType.outputs`:
```bash
Read file_path="apps/api/src/nodes/text/bart-large-cnn-node.ts"
```

Key fields: `inputs[].name` → `targetInput`, `outputs[].name` → `sourceOutput`

## Trigger Types

The `type` field defines how the workflow is triggered:

| Type | Description | Entry Node |
|------|-------------|------------|
| `manual` | User-initiated via UI/API | Input nodes (TextInputNode, etc.) |
| `email_message` | Triggered by incoming email | ReceiveEmailNode |
| `http_request` | Triggered by HTTP request (sync) | HttpRequestNode |
| `http_webhook` | Triggered by webhook (async) | HttpRequestNode |
| `scheduled` | Triggered on schedule (cron) | ReceiveScheduledTriggerNode |
| `queue_message` | Triggered by queue message | ReceiveQueueMessageNode |

**Finding trigger-compatible nodes:** Nodes declare which triggers they work with via the `compatibility` field in their `nodeType`. Search for compatible nodes:
```bash
Grep pattern="compatibility:.*email_message" path="apps/api/src/nodes" glob="*.ts"
Grep pattern="compatibility:.*http_request" path="apps/api/src/nodes" glob="*.ts"
```

## Create Template

**File:** `apps/api/src/templates/{template-id}.ts`

```typescript
import type { WorkflowTemplate } from "@dafthunk/types";
import { TextInputNode } from "../nodes/input/text-input-node";
import { BartLargeCnnNode } from "../nodes/text/bart-large-cnn-node";
import { TextPreviewNode } from "../nodes/preview/text-preview-node";

export const myTemplate: WorkflowTemplate = {
  id: "my-template",
  name: "My Template",
  description: "What it does",
  icon: "file-text",
  type: "manual",
  tags: ["text", "ai"],
  nodes: [
    TextInputNode.create({
      id: "text-to-process",
      name: "Text to Process",
      position: { x: 100, y: 100 },
      inputs: { value: "Sample text...", rows: 4 },
    }),
    BartLargeCnnNode.create({
      id: "summarizer",
      name: "Summarizer",
      position: { x: 500, y: 100 },
    }),
    TextPreviewNode.create({
      id: "result",
      name: "Summary",
      position: { x: 900, y: 100 },
    }),
  ],
  edges: [
    { source: "text-to-process", target: "summarizer", sourceOutput: "value", targetInput: "inputText" },
    { source: "summarizer", target: "result", sourceOutput: "summary", targetInput: "value" },
  ],
};
```

**Positioning:** Inputs at x:100, processing at x:500, outputs at x:900. Stack vertically with 200px spacing.

**Naming:** IDs are kebab-case (`text-to-translate`). Names are short Title Case, omit "Preview" for outputs.

## Logic Nodes

**ConditionalForkNode** - splits flow based on boolean:
- Inputs: `condition` (boolean), `value` (any)
- Outputs: `true`, `false` (only ONE has value)

**ConditionalJoinNode** - merges exclusive branches:
- Inputs: `a`, `b` (exactly ONE must have value)
- Output: `result`

```
[BooleanInput] ──condition──► [Fork] ──true──► [ProcessorA] ──►┐
[TextInput] ────value──────►        ──false─► [ProcessorB] ──►├─► [Join] ──► [Preview]
```

## Register & Test

**Register in** `apps/api/src/templates/index.ts`:
```typescript
import { myTemplate } from "./my-template";
export const workflowTemplates = [..., myTemplate];
```

**Test file** `{template-id}.integration.ts`:
```typescript
describe("My Template", () => {
  it("should have valid structure", () => {
    expect(myTemplate.nodes).toHaveLength(3);
    expect(myTemplate.edges).toHaveLength(2);
    const nodeIds = new Set(myTemplate.nodes.map(n => n.id));
    for (const edge of myTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });
});
```

**Run:** `pnpm typecheck && pnpm --filter '@dafthunk/api' test {template-id}`

## Type Compatibility

| Output | Compatible Inputs |
|--------|------------------|
| string | string, any |
| number | number, any |
| boolean | boolean, any |
| image | image, blob, any |
| audio | audio, blob, any |
| json | json, any |

## Checklist

- [ ] Nodes exist in codebase (verify with Glob/Read)
- [ ] Edge ports match node definitions exactly
- [ ] Types are compatible
- [ ] Registered in index.ts
- [ ] Tests pass
