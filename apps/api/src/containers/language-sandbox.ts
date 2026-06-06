import { Sandbox } from "@cloudflare/sandbox";

/**
 * Multi-language sandbox container.
 *
 * Subclasses the `@cloudflare/sandbox` `Sandbox` class so wrangler can bind
 * it under a distinct `class_name` with its own image (the multi-language
 * Dockerfile at `apps/api/Dockerfile`). The original `Sandbox` class is
 * still bound separately as `DUCKDB_SANDBOX` for parquet/DuckDB queries.
 */
export class LanguageSandbox extends Sandbox {}
