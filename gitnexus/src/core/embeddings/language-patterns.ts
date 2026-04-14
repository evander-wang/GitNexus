export interface LanguagePatterns {
  extractMethods(content: string): string[];
  extractProperties(content: string): string[];
}

function regexExtractor(re: RegExp, group: number = 1): (content: string) => string[] {
  return (content: string): string[] => {
    re.lastIndex = 0;
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      out.push(m[group]);
    }
    return out;
  };
}

// --- Regex constants ---

const tsMethodRe =
  /(?:(?:async|static|public|private|protected|readonly|abstract|override)\s+)*(?:\w+(?:<[^>]+>)?(?:\[\])?\s+)?(\w+)\s*\(/gm;
const tsPropertyRe =
  /(?:private|public|protected|readonly|static|abstract|override)\s+(\w+)\s*[;=:]/gm;

const pythonMethodRe = /def\s+(\w+)\s*\(/gm;
const pythonPropertyRe = /self\.(\w+)\s*=/gm;

const kotlinMethodRe =
  /(?:(?:public|private|protected|internal|suspend|inline|open|override)\s+)*fun\s+(\w+)\s*[(<]/gm;
const kotlinPropertyRe =
  /(?:(?:public|private|protected|internal|lateinit)\s+)*(?:val|var)\s+(\w+)/gm;

const goPropertyRe = /^\s+(\w+)\s+\w+/gm;

const rustMethodRe = /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*[(<]/gm;
const rustPropertyRe = /^\s+(\w+)\s*:/gm;

const javaMethodRe = new RegExp(
  `(?:public|private|protected|static)\\s+` +
    `(?:<[^>]+>\\s+)?` +
    `(?:\\w+(?:<[^>]+>)?(?:\\[\\])?\\s+)?` +
    `(\\w+)\\s*\\(`,
  'gm',
);
const javaPropertyRe = new RegExp(
  `(?:private|protected|public)?\\s*(?:static)?\\s*(?:final)?\\s*(?:readonly)?\\s*` +
    `\\w+(?:<[^>]+>)?(?:\\[\\])?` +
    `\\s+(\\w+)\\s*(?:[;=]|\\{)`,
  'gm',
);

const csharpMethodRe = new RegExp(
  `(?:public|private|protected|internal|static|virtual|override|async)\\s+` +
    `(?:<[^>]+>\\s+)?` +
    `(?:\\w+(?:<[^>]+>)?(?:\\[\\])?\\s+)?` +
    `(\\w+)\\s*\\(`,
  'gm',
);
const csharpPropertyRe =
  /(?:(?:public|private|protected|internal|static|readonly|virtual|override|sealed|abstract)\s+)+(?:\w+(?:<[^>]+>)?(?:\[\])?\s+)(\w+)\s*[;{]/gm;

const phpMethodRe = /(?:public|private|protected)\s+(?:static\s+)?function\s+(\w+)\s*\(/gm;
const phpPropertyRe = /(?:public|private|protected)\s+(?:\w+\s+)?\$(\w+)/gm;

const rubyMethodRe = /def\s+(?:self\.)?(\w+)/gm;
const rubyAttrLineRe = /attr_(?:accessor|reader|writer)\s+(.+)/gm;
const rubyAttrSymRe = /:(\w+)/g;

const swiftMethodRe =
  /(?:(?:public|private|internal|open|fileprivate|static|class|override)\s+)*func\s+(\w+)\s*[(<]/gm;
const swiftPropertyRe =
  /(?:(?:public|private|internal|open|fileprivate|static|class|override)\s+)*(?:var|let)\s+(\w+)\s*[:=]/gm;

const cppMethodRe =
  /(?:(?:virtual|static|inline|explicit|constexpr|const)\s+)*(?:\w+(?:<[^>]+>)?(?:\s*\*\s*|\s*&\s*|\s+)\s*)(\w+)\s*\(/gm;
const cppPropertyRe =
  /(?:(?:public|private|protected)\s*:\s*)?(?:(?:static|const|mutable|volatile)\s+)*(?:std::)?(?:\w+(?:<[^>]+>)?(?:\s*\*\s*|\s*&\s*|\s+))(\w+)\s*[;=]/gm;

const dartMethodRe =
  /(?:(?:static|async|factory)\s+)*(?:\w+(?:<[^>]+>)?(?:\?)?(?:\s*\(\))?\s+)?(\w+)\s*\(/gm;
const dartPropertyRe =
  /(?:(?:final|late|static|const)\s+)*(?:\w+(?:<[^>]+>)?)?\??\s+(?:<[^>]+>\s+)?(\w+)\s*[;=]/gm;

const jsMethodRe = /(?:(?:async|static|get|set)\s+)*(?:\w+(?:<[^>]+>)?(?:\[\])?\s+)?(\w+)\s*\(/gm;
const jsPropertyRe = /this\.(\w+)\s*=/gm;

// --- Special extractors with filtering ---

function extractGoProperties(content: string): string[] {
  goPropertyRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = goPropertyRe.exec(content)) !== null) {
    const name = m[1];
    if (name[0] >= 'A' && name[0] <= 'Z') {
      out.push(name);
    }
  }
  return out;
}

function extractRubyProperties(content: string): string[] {
  const out: string[] = [];
  rubyAttrLineRe.lastIndex = 0;
  let line: RegExpExecArray | null;
  while ((line = rubyAttrLineRe.exec(content)) !== null) {
    rubyAttrSymRe.lastIndex = 0;
    let sym: RegExpExecArray | null;
    while ((sym = rubyAttrSymRe.exec(line[1])) !== null) {
      out.push(sym[1]);
    }
  }
  return out;
}

function extractDartMethods(content: string): string[] {
  dartMethodRe.lastIndex = 0;
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = dartMethodRe.exec(content)) !== null) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

function extractDartProperties(content: string): string[] {
  dartPropertyRe.lastIndex = 0;
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = dartPropertyRe.exec(content)) !== null) {
    const name = m[1];
    if (name === 'class' || name === 'void' || name === 'async') continue;
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

// --- Pattern registry ---

export const PATTERNS: Record<string, LanguagePatterns> = {
  typescript: {
    extractMethods: regexExtractor(tsMethodRe),
    extractProperties: regexExtractor(tsPropertyRe),
  },
  javascript: {
    extractMethods: regexExtractor(jsMethodRe),
    extractProperties: regexExtractor(jsPropertyRe),
  },
  python: {
    extractMethods: regexExtractor(pythonMethodRe),
    extractProperties: regexExtractor(pythonPropertyRe),
  },
  java: {
    extractMethods: regexExtractor(javaMethodRe),
    extractProperties: regexExtractor(javaPropertyRe),
  },
  kotlin: {
    extractMethods: regexExtractor(kotlinMethodRe),
    extractProperties: regexExtractor(kotlinPropertyRe),
  },
  go: {
    extractMethods: () => [],
    extractProperties: extractGoProperties,
  },
  rust: {
    extractMethods: regexExtractor(rustMethodRe),
    extractProperties: regexExtractor(rustPropertyRe),
  },
  csharp: {
    extractMethods: regexExtractor(csharpMethodRe),
    extractProperties: regexExtractor(csharpPropertyRe),
  },
  php: {
    extractMethods: regexExtractor(phpMethodRe),
    extractProperties: regexExtractor(phpPropertyRe),
  },
  ruby: {
    extractMethods: regexExtractor(rubyMethodRe),
    extractProperties: extractRubyProperties,
  },
  swift: {
    extractMethods: regexExtractor(swiftMethodRe),
    extractProperties: regexExtractor(swiftPropertyRe),
  },
  cpp: {
    extractMethods: regexExtractor(cppMethodRe),
    extractProperties: regexExtractor(cppPropertyRe),
  },
  c: {
    extractMethods: regexExtractor(cppMethodRe),
    extractProperties: regexExtractor(cppPropertyRe),
  },
  dart: {
    extractMethods: extractDartMethods,
    extractProperties: extractDartProperties,
  },
};

export function getPatternsForLanguage(language: string): LanguagePatterns | undefined {
  return PATTERNS[language];
}
