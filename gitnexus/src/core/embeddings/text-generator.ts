/**
 * Text Generator Module
 *
 * Generates enriched embedding text from code nodes with metadata.
 * Supports chunkable labels (Function/Method with AST chunking),
 * Class-specific structural text, and short-node direct embed.
 */

import type { EmbeddableNode, EmbeddingConfig } from './types.js';
import { DEFAULT_EMBEDDING_CONFIG, isShortLabel } from './types.js';

/**
 * Truncate description to max length at sentence/word boundary
 */
const truncateDescription = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);

  // Try sentence boundary (. ! ?)
  const sentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? '),
  );
  if (sentenceEnd > maxLength * 0.5) {
    return truncated.slice(0, sentenceEnd + 1);
  }

  // Try word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.5) {
    return truncated.slice(0, lastSpace);
  }

  return truncated;
};

/**
 * Clean code content for embedding
 */
const cleanContent = (content: string): string => {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
};

/**
 * Build metadata header for a node
 */
const buildMetadataHeader = (node: EmbeddableNode, config: Partial<EmbeddingConfig>): string => {
  const parts: string[] = [];

  // Label + name
  parts.push(`${node.label}: ${node.name}`);

  // Repo name
  if (node.repoName) {
    parts.push(`Repo: ${node.repoName}`);
  }

  // Server name (optional)
  if (node.serverName) {
    parts.push(`Server: ${node.serverName}`);
  }

  // Full file path
  parts.push(`Path: ${node.filePath}`);

  // Export status
  if (node.isExported !== undefined) {
    parts.push(`Export: ${node.isExported}`);
  }

  // Description (truncated)
  if (node.description) {
    const maxLen = config.maxDescriptionLength ?? DEFAULT_EMBEDDING_CONFIG.maxDescriptionLength;
    const truncated = truncateDescription(node.description, maxLen);
    if (truncated) {
      parts.push(truncated);
    }
  }

  return parts.join('\n');
};

/**
 * Generate embedding text for Function/Method nodes
 * Includes metadata header + code body (chunk text passed separately)
 */
const generateFunctionText = (
  node: EmbeddableNode,
  codeBody: string,
  config: Partial<EmbeddingConfig>,
): string => {
  const header = buildMetadataHeader(node, config);
  const cleaned = cleanContent(codeBody);
  return `${header}\n\n${cleaned}`;
};

/**
 * Generate embedding text for Class nodes
 * Signature + properties + method name list only (no method bodies)
 *
 * NOTE: Method/property regex is currently tuned for JS/TS syntax.
 * Multi-language support (Python, Kotlin, Rust, etc.) is a TODO.
 */
const generateClassText = (
  node: EmbeddableNode,
  codeBody: string,
  config: Partial<EmbeddingConfig>,
): string => {
  const header = buildMetadataHeader(node, config);
  const parts: string[] = [header];

  // Extract method names and properties from content
  const cleaned = cleanContent(codeBody);
  const lines = cleaned.split('\n');

  const methods: string[] = [];
  const properties: string[] = [];
  const classBodyLines: string[] = [];
  let inClass = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect class opening (JS/TS only — Python `class Foo:`, Kotlin `class Foo` etc. are not yet handled)
    if (
      trimmed.match(/^(?:export\s+)?(?:abstract\s+)?class\s/) ||
      trimmed.startsWith('data class ')
    ) {
      inClass = true;
      classBodyLines.push(trimmed);
      continue;
    }
    if (!inClass) {
      classBodyLines.push(trimmed);
      continue;
    }

    // Extract method names
    const methodMatch = trimmed.match(
      /^(?:public|private|protected|static|async|abstract|\s)*\s*(\w+)\s*\(/,
    );
    if (methodMatch && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
      methods.push(methodMatch[1]);
    }

    // Extract property declarations
    const propMatch = trimmed.match(
      /^(?:public|private|protected|static|readonly)\s+(\w+)\s*[=:(]/,
    );
    if (propMatch) {
      properties.push(propMatch[1]);
    }

    // Keep class declaration + property lines (no method bodies)
    if (
      trimmed.match(/^(?:export\s+)?(?:abstract\s+)?class\s/) ||
      trimmed.startsWith('data class ') ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('}') ||
      trimmed === '' ||
      propMatch ||
      trimmed.endsWith(';') ||
      !trimmed.includes('{')
    ) {
      classBodyLines.push(trimmed);
    }
  }

  if (methods.length > 0) parts.push(`Methods: ${methods.join(', ')}`);
  if (properties.length > 0) parts.push(`Properties: ${properties.join(', ')}`);

  // Class declaration only (no method bodies)
  const declarationOnly = classBodyLines.join('\n').trim();
  if (declarationOnly) {
    parts.push('', declarationOnly);
  }

  return parts.join('\n');
};

/**
 * Generate embedding text for short nodes (TypeAlias, Const, etc.)
 * No chunking, just metadata + full content
 */
const generateShortNodeText = (node: EmbeddableNode, config: Partial<EmbeddingConfig>): string => {
  const header = buildMetadataHeader(node, config);
  const cleaned = cleanContent(node.content);
  return `${header}\n\n${cleaned}`;
};

/**
 * Generate embedding text for Interface/Struct/Enum/Trait/etc. (chunkable but non-function)
 */
const generateChunkableNonFunctionText = (
  node: EmbeddableNode,
  codeBody: string,
  config: Partial<EmbeddingConfig>,
): string => {
  const header = buildMetadataHeader(node, config);
  const cleaned = cleanContent(codeBody);
  return `${header}\n\n${cleaned}`;
};

/**
 * Generate embedding text for any embeddable node
 * Dispatches to the appropriate generator based on node label
 */
export const generateEmbeddingText = (
  node: EmbeddableNode,
  codeBody: string,
  config: Partial<EmbeddingConfig> = {},
): string => {
  if (isShortLabel(node.label)) {
    return generateShortNodeText(node, config);
  }

  if (node.label === 'Class') {
    return generateClassText(node, codeBody, config);
  }

  if (node.label === 'Function' || node.label === 'Method') {
    return generateFunctionText(node, codeBody, config);
  }

  // Other chunkable types (Interface, Struct, Enum, Trait, Impl, Macro, Namespace)
  return generateChunkableNonFunctionText(node, codeBody, config);
};

/**
 * Export truncation helper for testing
 */
export { truncateDescription };
