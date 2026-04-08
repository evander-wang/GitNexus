/**
 * Integration test: Embedding chunking pipeline
 *
 * Tests the chunking + text generation pipeline together.
 */
import { describe, it, expect } from 'vitest';
import { characterChunk } from '../../src/core/embeddings/character-chunk.js';
import { generateEmbeddingText } from '../../src/core/embeddings/text-generator.js';
import type { EmbeddableNode } from '../../src/core/embeddings/types.js';

describe('embedding-chunking integration', () => {
  const makeNode = (overrides: Partial<EmbeddableNode>): EmbeddableNode => ({
    id: 'Function:src/test.ts:test',
    name: 'test',
    label: 'Function',
    filePath: 'src/test.ts',
    content: '',
    startLine: 1,
    endLine: 10,
    ...overrides,
  });

  it('short function produces single chunk with metadata', () => {
    const node = makeNode({
      content: 'function hello() { return "world"; }',
      isExported: true,
      repoName: 'my-project',
      serverName: 'my-service',
    });

    const chunks = characterChunk(node.content, 1, 3, 1200, 120);
    expect(chunks).toHaveLength(1);

    const text = generateEmbeddingText(node, chunks[0].text);
    expect(text).toContain('Function: test');
    expect(text).toContain('Repo: my-project');
    expect(text).toContain('Server: my-service');
    expect(text).toContain('Export: true');
    expect(text).toContain('function hello()');
  });

  it('long function produces multiple chunks', () => {
    const longContent = Array.from({ length: 100 }, (_, i) => `  const line${i} = ${i};`).join(
      '\n',
    );
    const node = makeNode({
      content: `function longFn() {\n${longContent}\n}`,
      startLine: 1,
      endLine: 102,
    });

    const chunks = characterChunk(node.content, 1, 102, 1200, 120);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it('short labels (TypeAlias) skip chunking and embed directly', () => {
    const node = makeNode({
      label: 'TypeAlias',
      name: 'Result',
      content: 'type Result<T> = Success<T> | Error;',
    });

    const chunks = characterChunk(node.content, 1, 1, 1200, 120);
    expect(chunks).toHaveLength(1);

    const text = generateEmbeddingText(node, chunks[0].text);
    expect(text).toContain('TypeAlias: Result');
    expect(text).toContain('type Result<T> = Success<T> | Error;');
  });

  it('long enum uses character fallback', () => {
    const enumContent = Array.from(
      { length: 200 },
      (_, i) => `  Value${i} = "${'x'.repeat(20)}${i}",`,
    ).join('\n');
    const node = makeNode({
      label: 'Enum',
      name: 'LargeEnum',
      content: `enum LargeEnum {\n${enumContent}\n}`,
      startLine: 1,
      endLine: 202,
    });

    const chunks = characterChunk(node.content, 1, 202, 1200, 120);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('metadata is present in every chunk', () => {
    const longContent = 'x'.repeat(3000);
    const node = makeNode({
      content: longContent,
      repoName: 'test-repo',
    });

    const chunks = characterChunk(node.content, 1, 100, 1200, 120);
    expect(chunks.length).toBeGreaterThan(1);

    for (const chunk of chunks) {
      const text = generateEmbeddingText(node, chunk.text);
      expect(text).toContain('Function: test');
      expect(text).toContain('Repo: test-repo');
      expect(text).toContain('Path: src/test.ts');
    }
  });
});
