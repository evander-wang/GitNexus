/**
 * Shared AST utilities for the embedding pipeline.
 * Centralizes parser caching and tree-sitter node lookups
 * used by both chunker.ts and structural-extractor.ts.
 */

import { getLanguageFromFilename } from 'gitnexus-shared';
import { loadParser, loadLanguage, isLanguageAvailable } from '../tree-sitter/parser-loader.js';

// Module-level parser cache — delegates to parser-loader.ts singletons
let parserInstance: any = null;
const loadedLanguages = new Set<string>();

/**
 * Ensure parser is initialized and language is loaded, then parse content.
 * Returns null if language is unavailable or parsing fails.
 */
export const ensureAndParse = async (content: string, filePath: string): Promise<any | null> => {
  const language = getLanguageFromFilename(filePath);
  if (!language) return null;
  if (!isLanguageAvailable(language)) return null;

  if (!parserInstance) {
    parserInstance = await loadParser();
  }
  if (!loadedLanguages.has(language)) {
    await loadLanguage(language, filePath);
    loadedLanguages.add(language);
  }

  return parserInstance.parse(content);
};

/**
 * Find a node in the AST whose start/end rows match the given range (0-based).
 */
export const findNodeByRange = (node: any, startLine: number, endLine: number): any | null => {
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

/**
 * Find the first class/struct/interface/enum-like declaration in an AST.
 * Used when parsing node.content (a snippet, not a full file) where
 * absolute line numbers don't apply.
 */
export const findDeclarationNode = (root: any): any | null => {
  const CLASS_LIKE_TYPES = new Set([
    'class_declaration',
    'class_definition',
    'struct_declaration',
    'struct_item',
    'interface_declaration',
    'interface_definition',
    'enum_declaration',
    'enum_item',
    'type_declaration', // Go: type X struct
    'declaration', // Go: type X struct
    'object_declaration', // Kotlin: object
    'impl_item', // Rust: impl
  ]);

  if (CLASS_LIKE_TYPES.has(root.type)) return root;

  for (let i = 0; i < root.namedChildCount; i++) {
    const child = root.namedChild(i);
    if (!child) continue;
    if (CLASS_LIKE_TYPES.has(child.type)) return child;
    const found = findDeclarationNode(child);
    if (found) return found;
  }

  return null;
};
