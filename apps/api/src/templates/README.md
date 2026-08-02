# Workflow Templates

Templates are pre-built workflows users can instantiate from the UI. Each template defines a complete workflow with nodes, edges, and default values.

## Structure

```
templates/
├── index.ts                           # Registry: exports all templates
├── {template-name}.ts                 # Template definition
├── {template-name}.integration.ts     # Integration tests
└── README.md
```

## Creating a Template

### 1. Define the template file

Create `{template-name}.ts`:

```ts
import type { WorkflowTemplate } from "@dafthunk/types";

import { SomeNode } from "../nodes/category/some-node";
import { TextInputNode } from "../nodes/input/text-input-node";
import { TextPreviewNode } from "../nodes/preview/text-preview-node";

export const myTemplate: WorkflowTemplate = {
  id: "my-template",              // kebab-case, unique identifier
  name: "My Template",            // User-facing display name
  description: "What this template does",
  icon: "icon-name",              // Lucide icon name
  type: "manual",                 // "manual" | "http" | "scheduled" | "email" | "queue"
  tags: ["category", "feature"],  // For filtering in UI
  nodes: [...],
  edges: [...],
};
```

### 2. Register in index.ts

```ts
import { myTemplate } from "./my-template";

export const workflowTemplates: WorkflowTemplate[] = [
  // ... existing templates
  myTemplate,
];
```

### 3. Add integration tests

Create `{template-name}.integration.ts` to verify nodes execute correctly.

## Running the integration tests

```bash
pnpm --filter '@dafthunk/api' test:integration
```

Two things to know before trusting a result:

**They call Workers AI for real.** Workers AI has no local emulation, so
`wrangler.test.jsonc` binds it with `remote: true`. The suite needs Cloudflare
auth and bills your account for every model call. This is why CI runs `pnpm
test` and not `test:integration`.

**A failure is not always a defect.** The pool proxies remote bindings over a
connection that drops when several test files call Workers AI at once, showing
up as `Network connection lost.` on a different file each run — roughly two runs
in three on a full suite. Re-run the single file before believing it:

```bash
pnpm --filter '@dafthunk/api' test:integration text-summarization
```

Retrying inside vitest does not help (the connection stays dead for that
worker), and serializing with `fileParallelism: false` makes it worse.

**Pin models that are still served.** Cloudflare retires Workers AI models on
published dates, and a retired model fails at runtime with `5028: This model was
deprecated`. `@cf/facebook/bart-large-cnn` and `@cf/unum/uform-gen2-qwen-500m`
both went out on 2026-05-30 while still pinned in templates here. Assert the
model your template pins, and have the test actually execute the node — a test
that only checks wiring will not notice the model is gone.

## Naming Conventions

### Node IDs

Use kebab-case IDs that describe the node's purpose:

| Pattern       | Example                                  |
| ------------- | ---------------------------------------- |
| Input data    | `text-to-summarize`, `image-prompt`      |
| Configuration | `source-language`, `target-language`     |
| Processing    | `text-summarizer`, `image-describer`     |
| Output        | `summary-preview`, `translation-preview` |

### Node Names

Use short, intent-reflecting Title Case names:

| Good                | Avoid                     |
| ------------------- | ------------------------- |
| `Generated Image`   | `Generated Image Preview` |
| `Summary`           | `Summary Preview`         |
| `Positive Score`    | `Positive Score Output`   |
| `Text to Translate` | `Input Text`              |

Names should describe **what** the node represents, not **how** it works.

## Node Positioning

Use a left-to-right flow with consistent spacing:

```
Input nodes      Processing nodes      Output nodes
x: 100           x: 500                x: 900
```

For multiple inputs, stack vertically with ~200px spacing:

```ts
{ position: { x: 100, y: 0 } }    // First input
{ position: { x: 100, y: 200 } }  // Second input
{ position: { x: 100, y: 400 } }  // Third input
```

## Creating Nodes

Use the static `create()` method from node classes:

```ts
TextInputNode.create({
  id: "text-to-translate",
  name: "Text to Translate", // Optional: overrides default node name
  position: { x: 100, y: 0 },
  inputs: {
    // Optional: override default input values
    value: "Hello, world!",
    placeholder: "Enter text...",
    rows: 4,
  },
});
```

## Defining Edges

Connect nodes by specifying source/target IDs and port names:

```ts
edges: [
  {
    source: "text-to-translate", // Source node ID
    target: "text-translator", // Target node ID
    sourceOutput: "value", // Output port name on source
    targetInput: "text", // Input port name on target
  },
];
```

## Template Types

| Type        | Trigger           | Use Case                |
| ----------- | ----------------- | ----------------------- |
| `manual`    | User clicks "Run" | Interactive workflows   |
| `http`      | HTTP request      | API endpoints, webhooks |
| `scheduled` | Cron schedule     | Periodic tasks          |
| `email`     | Incoming email    | Email processing        |
| `queue`     | Queue message     | Async processing        |

## Example Template

```ts
import type { WorkflowTemplate } from "@dafthunk/types";

import { TextInputNode } from "../nodes/input/text-input-node";
import { TextPreviewNode } from "../nodes/preview/text-preview-node";
import { BartLargeCnnNode } from "../nodes/text/bart-large-cnn-node";

export const textSummarizationTemplate: WorkflowTemplate = {
  id: "text-summarization",
  name: "Text Summarization",
  description: "Summarize long text content using AI",
  icon: "file-text",
  type: "manual",
  tags: ["text", "summarization", "ai"],
  nodes: [
    TextInputNode.create({
      id: "text-to-summarize",
      name: "Text to Summarize",
      position: { x: 100, y: 100 },
      inputs: {
        value: "Your long text here...",
        placeholder: "Enter text here...",
        rows: 4,
      },
    }),
    BartLargeCnnNode.create({
      id: "text-summarizer",
      name: "Text Summarizer",
      position: { x: 500, y: 100 },
      inputs: { maxLength: 20 },
    }),
    TextPreviewNode.create({
      id: "summary-preview",
      name: "Summary",
      position: { x: 900, y: 100 },
    }),
  ],
  edges: [
    {
      source: "text-to-summarize",
      target: "text-summarizer",
      sourceOutput: "value",
      targetInput: "inputText",
    },
    {
      source: "text-summarizer",
      target: "summary-preview",
      sourceOutput: "summary",
      targetInput: "value",
    },
  ],
};
```
