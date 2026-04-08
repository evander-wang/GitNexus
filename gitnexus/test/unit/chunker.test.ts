/**
 * Unit tests for character chunking logic
 */
import { describe, it, expect } from 'vitest';
import { characterChunk } from '../../src/core/embeddings/character-chunk.js';

describe('characterChunk', () => {
  it('returns single chunk when content fits', () => {
    const result = characterChunk('short content', 1, 5, 1200, 120);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('short content');
    expect(result[0].chunkIndex).toBe(0);
    expect(result[0].startLine).toBe(1);
    expect(result[0].endLine).toBe(5);
  });

  it('splits long content into multiple chunks', () => {
    const longContent = 'a'.repeat(3000);
    const result = characterChunk(longContent, 1, 100, 1200, 120);
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.text.length).toBeLessThanOrEqual(1200);
    }
  });

  it('maintains sequential chunkIndex', () => {
    const longContent = 'x'.repeat(3000);
    const result = characterChunk(longContent, 1, 100, 1200, 120);
    for (let i = 0; i < result.length; i++) {
      expect(result[i].chunkIndex).toBe(i);
    }
  });

  it('includes overlap between chunks', () => {
    const content = 'abcdefghij'.repeat(200);
    const result = characterChunk(content, 1, 50, 500, 50);
    if (result.length > 1) {
      const endOfFirst = result[0].text.slice(-50);
      expect(result[1].text.startsWith(endOfFirst)).toBe(true);
    }
  });
});
