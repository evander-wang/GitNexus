# Embedding Chunking Optimization Design

**Date:** 2026-04-14
**Branch:** feat/embeding_chunking
**PR:** abhigyanpatwari/GitNexus#738
**Status:** Design approved

## Context

PR #738 adds chunking support for long code nodes in the embedding pipeline. CI passes (6068 tests, tsc clean). The maintainer (magyargergo) approved the direction and requested: "We just need to support all the languages."

A Claude Code review identified performance issues, implementation gaps, and architectural concerns. This design addresses the actionable items with a "minimal multi-language" scope.

## Scope

### In scope

1. Multi-language `generateClassText` (language-specific regex patterns for 14 languages)
2. `Constructor` support in embeddable labels
3. Parser caching + dynamic import hoisting
4. `overlapText` line-boundary fix
5. Test coverage for `chunkNode` dispatch + multi-language patterns

### Explicitly out of scope

- AST chunking for Class/Interface/Struct types (only Function/Method use AST)
- Structural text generation for Trait/Impl/Namespace
- `server-mapping.ts` singleton cache staleness
- `embedding-pipeline.ts` progress counter accuracy
- Cypher vector string interpolation
- Incremental cache content-change detection

## File Changes

### New file: `gitnexus/src/core/embeddings/language-patterns.ts`

Language-specific regex patterns for extracting method and property names from class bodies.

**Interface:**

```typescript
export interface LanguagePatterns {
  extractMethods(content: string): string[];
  extractProperties(content: string): string[];
}

export const PATTERNS: Record<string, LanguagePatterns>;
export function getPatternsForLanguage(language: string): LanguagePatterns | undefined;
```

**Language coverage:**

| Language | Method pattern strategy | Property pattern strategy |
|----------|------------------------|--------------------------|
| TypeScript | `(modifier)* name(params)` | `(modifier)* name: Type` |
| JavaScript | `(modifier)* name(params)` | `this.name = value` |
| Python | `def name(self, ...)` | `self.name = value` |
| Java | `(modifier)* Type name(params)` | `(modifier)* Type name;` |
| Kotlin | `fun name(params)` | `val/var name: Type` |
| Go | (struct fields only, methods are external) | `Name Type` in struct |
| Rust | `fn name(&self, ...)` in impl | `name: Type` in struct |
| C# | `(modifier)* Type name(params)` | `(modifier)* Type Name { get; set; }` |
| PHP | `(modifier)* function name(params)` | `(modifier)* Type $name;` |
| Ruby | `def name` / `def self.name` | `attr_accessor/reader/writer :name` |
| Swift | `(modifier)* func name(params)` | `var/let name: Type` |
| C/C++ | `Type name(params)` in class | `Type name;` in class |
| Dart | `(modifier)* Type name(params)` | `(modifier)* Type name;` |

**Fallback:** If no language pattern matches, use the existing JS/TS regex as default.

### New test file: `gitnexus/test/unit/language-patterns.test.ts`

Per-language regex tests (method + property extraction for each of the 13 language entries in the table above).

### Modified: `gitnexus/src/core/embeddings/types.ts`

Add `Constructor` to `CHUNKABLE_LABELS`:

```typescript
export const CHUNKABLE_LABELS = [
  'Function',
  'Method',
  'Class',
  'Interface',
  'Struct',
  'Enum',
  'Trait',
  'Impl',
  'Macro',
  'Namespace',
  'Constructor',  // NEW
] as const;
```

Constructor gets character-based chunking (not AST). Long constructors in DI containers benefit from chunking capability.

### Modified: `gitnexus/src/core/embeddings/text-generator.ts`

- `generateClassText`: dispatch to `language-patterns.ts` based on file extension
- New `generateConstructorText`: metadata header + full code body (constructors have no method/property structure to extract)
- `generateEmbeddingText`: add `Constructor` dispatch to `generateConstructorText`

### Modified: `gitnexus/src/core/embeddings/chunker.ts`

**Parser caching (performance):**

```typescript
// Module-level cache
let parserInstance: any = null;
const loadedLanguages = new Set<string>();

// Inside astChunk — check cache before init
if (!parserInstance) {
  parserInstance = await loadParser();
}
if (!loadedLanguages.has(language)) {
  await loadLanguage(language, filePath);
  loadedLanguages.add(language);
}
```

This caches the Parser instance and tracks loaded languages. Safe because:
- Parser is stateless — `parse()` produces a fresh AST each time
- Language grammars are read-only
- No data is cached, only tooling instances

**Import hoisting:**

Replace `await import('gitnexus-shared')` inside `astChunk` with a top-level static import: `import { getLanguageFromFilename } from 'gitnexus-shared'`. This eliminates repeated dynamic import resolution overhead in the hot loop.

**overlapText line-boundary fix:**

```typescript
const overlapText = (text: string, overlapSize: number): string => {
  if (text.length <= overlapSize) return text;
  const start = text.length - overlapSize;
  const newlineIdx = text.indexOf('\n', start);
  if (newlineIdx >= 0 && newlineIdx < start + 50) {
    return text.slice(newlineIdx + 1);
  }
  return text.slice(start);
};
```

50-character tolerance — uses nearest newline if within range, otherwise falls back to character slicing.

## Test Plan

### `chunker.test.ts` — chunkNode dispatch tests

| Test case | Covers |
|-----------|--------|
| Short content returns single chunk | `content.length <= chunkSize` branch |
| Function label uses AST chunking | AST success path (mocked) |
| Class label uses character fallback | Non-Function/Method fallback |
| AST parse failure falls back to character | try/catch branch |
| Constructor label uses character chunking | New CHUNKABLE type |

AST tests use `vi.mock` for tree-sitter dependencies.

### `language-patterns.test.ts` — per-language regex tests

Each language gets 2 tests (method extraction + property extraction) with realistic code samples.

### `text-generator.test.ts` — multi-language + Constructor tests

- Constructor text generation produces correct metadata header
- `generateClassText` dispatches to correct language pattern
- Unknown language falls back to JS/TS default

### overlapText tests

| Test case | Expected |
|-----------|----------|
| Text with newlines in overlap range | Starts after newline |
| Text without newlines | Falls back to character slicing |
| Text shorter than overlapSize | Returns full text |

## Risks

- **Regex accuracy:** Language-specific regexes won't handle 100% of edge cases (decorators, macros, unusual syntax). The fallback to JS/TS default mitigates this — worst case is empty method/property lists, not errors.
- **Constructor in CHUNKABLE_LABELS:** If most constructors are short, they won't actually be chunked (the `content.length <= chunkSize` check handles this). No risk of over-chunking.
- **Parser cache invalidation:** Not needed within a single `analyze` run. Language grammars don't change at runtime.
