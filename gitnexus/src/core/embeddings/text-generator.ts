/**
 * Text Generator Module
 *
 * Generates enriched embedding text from code nodes with metadata.
 * Supports chunkable labels (Function/Method with AST chunking),
 * Class-specific structural text, and short-node direct embed.
 */

import type { EmbeddableNode, EmbeddingConfig } from './types.js';
import { DEFAULT_EMBEDDING_CONFIG, isShortLabel } from './types.js';
import { getLanguageFromFilename } from 'gitnexus-shared';
import { getPatternsForLanguage } from './language-patterns.js';

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
 * Generate embedding text for Constructor nodes
 */
const generateConstructorText = (
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
 * Multi-language: dispatches to language-patterns for method/property extraction.
 */
const generateClassText = (
  node: EmbeddableNode,
  codeBody: string,
  config: Partial<EmbeddingConfig>,
): string => {
  const header = buildMetadataHeader(node, config);
  const parts: string[] = [header];

  const cleaned = cleanContent(codeBody);

  // Try language-specific patterns first
  const language = getLanguageFromFilename(node.filePath);
  const patterns = language ? getPatternsForLanguage(language) : undefined;

  if (patterns) {
    const methods = patterns.extractMethods(cleaned);
    const properties = patterns.extractProperties(cleaned);
    if (methods.length > 0) parts.push(`Methods: ${methods.join(', ')}`);
    if (properties.length > 0) parts.push(`Properties: ${properties.join(', ')}`);
  } else {
    // Fallback: original JS/TS regex
    const methods: string[] = [];
    const properties: string[] = [];
    const lines = cleaned.split('\n');
    let inClass = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.match(/^(?:export\s+)?(?:abstract\s+)?class\s/) ||
        trimmed.startsWith('data class ')
      ) {
        inClass = true;
        continue;
      }
      if (!inClass) continue;

      const methodMatch = trimmed.match(
        /^(?:public|private|protected|static|async|abstract|\s)*\s*(\w+)\s*\(/,
      );
      if (methodMatch && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        methods.push(methodMatch[1]);
      }

      const propMatch = trimmed.match(
        /^(?:public|private|protected|static|readonly)\s+(\w+)\s*[=:(]/,
      );
      if (propMatch) {
        properties.push(propMatch[1]);
      }
    }

    if (methods.length > 0) parts.push(`Methods: ${methods.join(', ')}`);
    if (properties.length > 0) parts.push(`Properties: ${properties.join(', ')}`);
  }

  // Class declaration only (no method bodies)
  const declarationOnly = extractDeclarationOnly(cleaned);
  if (declarationOnly) {
    parts.push('', declarationOnly);
  }

  return parts.join('\n');
};

/**
 * Extract class/interface/struct declaration lines (no method bodies)
 */
const extractDeclarationOnly = (content: string): string => {
  const lines = content.split('\n');
  const declLines: string[] = [];
  let depth = 0;
  let started = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !started &&
      (trimmed.match(/^(?:export\s+)?(?:abstract\s+)?(?:data\s+)?class\s/) ||
        trimmed.match(/^(?:pub\s+)?struct\s/) ||
        trimmed.match(/^(?:pub\s+)?enum\s/) ||
        trimmed.match(/^type\s+\w+\s+struct/) ||
        trimmed.match(/^class\s/) ||
        trimmed.match(/^interface\s/))
    ) {
      started = true;
    }
    if (started) {
      depth += (trimmed.match(/\{/g) || []).length;
      depth -= (trimmed.match(/\}/g) || []).length;
      declLines.push(trimmed);
      if (depth <= 0 && declLines.length > 1) break;
    }
  }

  return declLines.join('\n').trim();
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

  if (node.label === 'Constructor') {
    return generateConstructorText(node, codeBody, config);
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
