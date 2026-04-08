/**
 * Chunker Module
 *
 * Splits code nodes into chunks for embedding.
 * - Function/Method/Constructor: AST-aware chunking by statement boundaries
 * - Other types: character-based sliding window fallback
 * - Short content (≤ chunkSize): no chunking
 */

export { type Chunk, characterChunk } from './character-chunk.js';

import { characterChunk } from './character-chunk.js';
import type { Chunk } from './character-chunk.js';

/**
 * Main chunkNode function: dispatches by label
 */
export const chunkNode = async (
  label: string,
  content: string,
  filePath: string,
  startLine: number,
  endLine: number,
  chunkSize: number = 1200,
  overlap: number = 120,
): Promise<Chunk[]> => {
  // Content fits in one chunk — no splitting needed
  if (content.length <= chunkSize) {
    return [{ text: content, chunkIndex: 0, startLine, endLine }];
  }

  // Only Function/Method get AST chunking
  if (label === 'Function' || label === 'Method') {
    try {
      const astChunks = await astChunk(content, filePath, startLine, endLine, chunkSize, overlap);
      if (astChunks.length > 0) return astChunks;
    } catch {
      // AST parsing failed — fall through to character fallback
    }
  }

  // Character-based fallback for everything else
  return characterChunk(content, startLine, endLine, chunkSize, overlap);
};

/**
 * AST-based chunking for Function/Method
 * Parse file, locate node by startLine/endLine, split body by statements
 */
const astChunk = async (
  content: string,
  filePath: string,
  startLine: number,
  endLine: number,
  chunkSize: number,
  overlap: number,
): Promise<Chunk[]> => {
  const { getLanguageFromFilename } = await import('gitnexus-shared');
  const language = getLanguageFromFilename(filePath);
  if (!language) return [];

  const { loadParser, loadLanguage, isLanguageAvailable } =
    await import('../tree-sitter/parser-loader.js');
  if (!isLanguageAvailable(language)) return [];
  const parser = await loadParser();
  await loadLanguage(language, filePath);

  const tree = parser.parse(content);
  const root = tree.rootNode;

  // Find the node matching our startLine/endLine (0-based in tree-sitter)
  const targetNode = findNodeByRange(root, startLine, endLine);
  if (!targetNode) return [];

  // Get the body (statements) via childForFieldName('body')
  const bodyNode = targetNode.childForFieldName('body');
  if (!bodyNode) return [];

  // Extract individual statements
  const statements: Array<{ text: string; startRow: number; endRow: number }> = [];
  for (let i = 0; i < bodyNode.namedChildCount; i++) {
    const child = bodyNode.namedChild(i);
    if (!child) continue;
    statements.push({
      text: child.text,
      startRow: child.startPosition.row,
      endRow: child.endPosition.row,
    });
  }

  if (statements.length === 0) return [];

  // Extract signature (everything before the body)
  const bodyStart = bodyNode.startIndex;
  const signature = content.slice(0, bodyStart).trim();

  // Greedy merge statements into chunks
  const chunks: Chunk[] = [];
  let currentText = '';
  let currentStartRow = startLine;
  let currentEndRow = startLine;
  let isFirst = true;

  for (const stmt of statements) {
    const candidateText = currentText ? `${currentText}\n${stmt.text}` : stmt.text;

    // For first chunk, include signature
    const fullCandidate = isFirst ? `${signature}\n${candidateText}` : candidateText;

    if (fullCandidate.length > chunkSize && currentText.length > 0) {
      // Current chunk is full — emit it
      chunks.push({
        text: isFirst ? `${signature}\n${currentText}` : currentText,
        chunkIndex: chunks.length,
        startLine: currentStartRow + 1, // 1-based
        endLine: currentEndRow + 1,
      });
      // Start new chunk with overlap
      currentText = overlapText(currentText, overlap) + '\n' + stmt.text;
      currentStartRow = stmt.startRow;
      isFirst = false;
    } else {
      currentText = candidateText;
    }
    currentEndRow = stmt.endRow;
  }

  // Emit remaining chunk
  if (currentText.length > 0) {
    chunks.push({
      text: isFirst ? `${signature}\n${currentText}` : currentText,
      chunkIndex: chunks.length,
      startLine: currentStartRow + 1,
      endLine: currentEndRow + 1,
    });
  }

  // Handle single statement longer than chunkSize — character fallback
  if (chunks.length === 1 && chunks[0].text.length > chunkSize) {
    return characterChunk(content, startLine, endLine, chunkSize, overlap);
  }

  return chunks;
};

/**
 * Find a node in the AST that matches the given line range
 */
const findNodeByRange = (node: any, startLine: number, endLine: number): any | null => {
  if (node.startPosition.row === startLine && node.endPosition.row === endLine) {
    return node;
  }

  if (node.startPosition.row <= startLine && node.endPosition.row >= endLine) {
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (!child) continue;
      const found = findNodeByRange(child, startLine, endLine);
      if (found) return found;
    }
  }

  return null;
};

const overlapText = (text: string, overlapSize: number): string => {
  if (text.length <= overlapSize) return text;
  return text.slice(text.length - overlapSize);
};
