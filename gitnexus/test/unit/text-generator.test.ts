import { describe, it, expect } from 'vitest';
import {
  generateEmbeddingText,
  truncateDescription,
} from '../../src/core/embeddings/text-generator.js';
import { isChunkableLabel } from '../../src/core/embeddings/types.js';
import type { EmbeddableNode } from '../../src/core/embeddings/types.js';

const baseNode: EmbeddableNode = {
  id: 'Function:src/utils.ts:parseJSON',
  name: 'parseJSON',
  label: 'Function',
  filePath: 'src/utils/parser.ts',
  content: 'function parseJSON(text: string): Result<any> {\n  return JSON.parse(text);\n}',
  startLine: 10,
  endLine: 12,
};

describe('text-generator', () => {
  describe('generateEmbeddingText', () => {
    it('includes metadata header for Function', () => {
      const node: EmbeddableNode = {
        ...baseNode,
        isExported: true,
        repoName: 'backend-user-ms',
      };
      const text = generateEmbeddingText(node, node.content);
      expect(text).toContain('Function: parseJSON');
      expect(text).toContain('Repo: backend-user-ms');
      expect(text).toContain('Path: src/utils/parser.ts');
      expect(text).toContain('Export: true');
      expect(text).toContain('function parseJSON');
    });

    it('includes Server line when serverName is set', () => {
      const node: EmbeddableNode = {
        ...baseNode,
        repoName: 'backend-user-ms',
        serverName: 'user-service',
      };
      const text = generateEmbeddingText(node, node.content);
      expect(text).toContain('Server: user-service');
    });

    it('omits Server line when serverName is undefined', () => {
      const text = generateEmbeddingText(baseNode, baseNode.content);
      expect(text).not.toContain('Server:');
    });

    it('includes truncated description', () => {
      const node: EmbeddableNode = {
        ...baseNode,
        description: 'This function parses JSON text and returns a typed result object.',
      };
      const text = generateEmbeddingText(node, node.content);
      expect(text).toContain('This function parses JSON text');
    });

    it('generates short node text for TypeAlias without chunking', () => {
      const node: EmbeddableNode = {
        ...baseNode,
        label: 'TypeAlias',
        name: 'Result',
        content: 'type Result<T> = Success<T> | Error;',
      };
      const text = generateEmbeddingText(node, node.content);
      expect(text).toContain('TypeAlias: Result');
      expect(text).toContain('type Result<T> = Success<T> | Error;');
    });

    it('generates Class text with method names', () => {
      const node: EmbeddableNode = {
        ...baseNode,
        label: 'Class',
        name: 'Parser',
        content: `class Parser {
  options: ParserOptions;
  private cache: Map<string, any>;
  parseJSON(text: string) { return JSON.parse(text); }
  validate() { return true; }
}`,
      };
      const text = generateEmbeddingText(node, node.content);
      expect(text).toContain('Class: Parser');
      expect(text).toContain('Methods:');
      expect(text).toContain('parseJSON');
      expect(text).toContain('validate');
      expect(text).toContain('Properties:');
      expect(text).toContain('options');
    });
  });

  describe('Constructor label', () => {
    it('is recognized as chunkable', () => {
      expect(isChunkableLabel('Constructor')).toBe(true);
    });

    it('is recognized as embeddable', () => {
      const node: EmbeddableNode = {
        ...baseNode,
        label: 'Constructor',
        name: 'constructor',
        content: 'constructor(private service: ApiClient) {\n  this.service = service;\n}',
      };
      const text = generateEmbeddingText(node, node.content);
      expect(text).toContain('Constructor: constructor');
      expect(text).toContain('this.service = service');
    });
  });

  describe('truncateDescription', () => {
    it('returns short text unchanged', () => {
      expect(truncateDescription('short text', 150)).toBe('short text');
    });

    it('truncates at sentence boundary', () => {
      const text = 'First sentence. Second sentence. Third very long sentence that goes on and on.';
      const result = truncateDescription(text, 40);
      expect(result).toContain('First sentence');
      expect(result.length).toBeLessThan(text.length);
    });

    it('truncates at word boundary when no sentence end', () => {
      const text =
        'this is a long description without any sentence ending punctuation marks at all';
      const result = truncateDescription(text, 30);
      expect(result.length).toBeLessThanOrEqual(30);
      expect(result.length).toBeLessThan(text.length);
    });
  });
});
