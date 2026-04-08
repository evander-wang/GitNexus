/**
 * Character-based sliding window chunking (pure, no tree-sitter dependency)
 */

export interface Chunk {
  text: string;
  chunkIndex: number;
  startLine: number;
  endLine: number;
}

export const characterChunk = (
  content: string,
  startLine: number,
  endLine: number,
  chunkSize: number = 1200,
  overlap: number = 120,
): Chunk[] => {
  if (content.length <= chunkSize) {
    return [{ text: content, chunkIndex: 0, startLine, endLine }];
  }

  const chunks: Chunk[] = [];
  let offset = 0;
  const lines = content.split('\n');

  // Build cumulative offset lookup for O(1) line estimation
  const lineOffsets = new Int32Array(lines.length);
  let acc = 0;
  for (let i = 0; i < lines.length; i++) {
    lineOffsets[i] = acc;
    acc += lines[i].length + 1;
  }

  while (offset < content.length) {
    const end = Math.min(offset + chunkSize, content.length);
    const chunkText = content.slice(offset, end);

    chunks.push({
      text: chunkText,
      chunkIndex: chunks.length,
      startLine: estimateLineFromOffset(lineOffsets, offset, startLine),
      endLine: estimateLineFromOffset(lineOffsets, end, startLine),
    });

    offset = end - overlap;
    if (offset >= content.length) break;
    if (end >= content.length) break;
    if (offset <= (chunks.length > 1 ? end - chunkSize : 0)) {
      offset = end;
    }
  }

  return chunks;
};

const estimateLineFromOffset = (
  lineOffsets: Int32Array,
  charOffset: number,
  startLine: number,
): number => {
  let lo = 0;
  let hi = lineOffsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineOffsets[mid] <= charOffset) lo = mid;
    else hi = mid - 1;
  }
  return startLine + lo + 1;
};
