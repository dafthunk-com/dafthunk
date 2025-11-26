---
name: ts-morph-analyze
description: Analyze TypeScript code structure using ts-morph. Use for summarizing class/interface APIs, listing exports, showing inheritance hierarchies, or extracting interfaces from classes. Outputs signatures without implementation details.
---

# TypeScript Code Analysis with ts-morph

Analyze TypeScript code structure to extract APIs, signatures, and relationships without implementation details.

## Installation

```bash
cd .claude/skills/ts-morph-analyze
pnpm install
```

## Available Scripts

### summarize-class.ts

Extract the API signature of a class or interface, showing only public members without implementation.

**Usage:**
```bash
npx tsx scripts/summarize-class.ts <tsconfig> <file> <name> [--private] [--jsdoc]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `tsconfig` | Yes | Path to tsconfig.json |
| `file` | Yes | Source file containing the class/interface |
| `name` | Yes | Class or interface name |
| `--private` | No | Include private and protected members |
| `--jsdoc` | No | Include JSDoc comments |

**Example:**
```bash
npx tsx scripts/summarize-class.ts ./tsconfig.json src/nodes/types.ts ExecutableNode
```

**Output:**
```typescript
export abstract class ExecutableNode {
  readonly nodeId: string;
  constructor(nodeId: string);
  abstract execute(ctx: Context): Promise<Response>;
  protected createResponse(status: number, data: unknown): Response;
}
```

---

### list-exports.ts

List all exports from a file or directory with their types and signatures.

**Usage:**
```bash
npx tsx scripts/list-exports.ts <tsconfig> <path> [--recursive] [--types-only] [--functions-only] [--classes-only]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `tsconfig` | Yes | Path to tsconfig.json |
| `path` | Yes | File or directory to analyze |
| `--recursive` | No | Recursively analyze directories |
| `--types-only` | No | Show only type/interface exports |
| `--functions-only` | No | Show only function exports |
| `--classes-only` | No | Show only class exports |

**Example:**
```bash
npx tsx scripts/list-exports.ts ./tsconfig.json src/utils/
```

**Output:**
```
src/utils/string.ts:
  export function formatDate(date: Date): string
  export function parseJSON<T>(input: string): Result<T>
  export type Result<T> = { success: true; value: T } | { success: false; error: string }

src/utils/validation.ts:
  export function validateEmail(email: string): boolean
  export interface ValidationResult { valid: boolean; errors: string[] }
```

---

### show-hierarchy.ts

Display the inheritance hierarchy for a class, showing parent classes and implemented interfaces.

**Usage:**
```bash
npx tsx scripts/show-hierarchy.ts <tsconfig> <file> <class-name> [--descendants] [--depth=N]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `tsconfig` | Yes | Path to tsconfig.json |
| `file` | Yes | Source file containing the class |
| `class-name` | Yes | Name of the class to analyze |
| `--descendants` | No | Also show classes that extend this class |
| `--depth=N` | No | Limit hierarchy depth (default: unlimited) |

**Example:**
```bash
npx tsx scripts/show-hierarchy.ts ./tsconfig.json src/nodes/text-node.ts TextNode --descendants
```

**Output:**
```
TextNode
├── extends: ExecutableNode
│   └── implements: NodeInterface
└── descendants:
    ├── MarkdownNode
    └── HtmlNode
```

---

### extract-interface.ts

Generate a TypeScript interface from a class's public members.

**Usage:**
```bash
npx tsx scripts/extract-interface.ts <tsconfig> <file> <class-name> [--name=InterfaceName] [--include-protected]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `tsconfig` | Yes | Path to tsconfig.json |
| `file` | Yes | Source file containing the class |
| `class-name` | Yes | Name of the class to extract from |
| `--name=Name` | No | Name for the generated interface (default: I{ClassName}) |
| `--include-protected` | No | Include protected members |

**Example:**
```bash
npx tsx scripts/extract-interface.ts ./tsconfig.json src/services/user.ts UserService --name=IUserService
```

**Output:**
```typescript
export interface IUserService {
  readonly id: string;
  getName(): string;
  getEmail(): Promise<string>;
  update(data: UserData): Promise<void>;
}
```

---

## Use Cases

- **API Review**: Quickly understand a class's public interface
- **Documentation**: Generate API summaries for documentation
- **Refactoring Planning**: See inheritance relationships before changes
- **Interface Extraction**: Create interfaces from existing implementations
- **Codebase Exploration**: List exports to understand module structure

## Output Formats

All scripts output TypeScript syntax by default. The output can be:
- Piped to a file: `npx tsx scripts/summarize-class.ts ... > api.d.ts`
- Used for documentation
- Compared with git diff to track API changes
