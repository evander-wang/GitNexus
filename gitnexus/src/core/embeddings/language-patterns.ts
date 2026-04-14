export interface LanguagePatterns {
  extractMethods(content: string): string[];
  extractProperties(content: string): string[];
}

function cStyleMethods(modifiers: string): (content: string) => string[] {
  const re = new RegExp(
    `(?:${modifiers})\\s+` +
      `(?:<[^>]+>\\s+)?` +
      `(?:\\w+(?:<[^>]+>)?(?:\\[\\])?\\s+)?` +
      `(\\w+)\\s*\\(`,
    'gm',
  );
  return (content: string): string[] => {
    re.lastIndex = 0;
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      out.push(m[1]);
    }
    return out;
  };
}

function cStyleProperties(typePattern: string): (content: string) => string[] {
  const re = new RegExp(
    `(?:private|protected|public)?\\s*(?:static)?\\s*(?:final)?\\s*(?:readonly)?\\s*` +
      typePattern +
      `\\s+(\\w+)\\s*(?:[;=]|\\{)`,
    'gm',
  );
  return (content: string): string[] => {
    re.lastIndex = 0;
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      out.push(m[1]);
    }
    return out;
  };
}

const tsMethodRe =
  /(?:(?:async|static|public|private|protected|readonly|abstract|override)\s+)*(?:\w+(?:<[^>]+>)?(?:\[\])?\s+)?(\w+)\s*\(/gm;

const tsPropertyRe =
  /(?:private|public|protected|readonly|static|abstract|override)\s+(\w+)\s*[;=:]/gm;

function extractTsMethods(content: string): string[] {
  tsMethodRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tsMethodRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractTsProperties(content: string): string[] {
  tsPropertyRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tsPropertyRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

const pythonMethodRe = /def\s+(\w+)\s*\(/gm;
const pythonPropertyRe = /self\.(\w+)\s*=/gm;

function extractPythonMethods(content: string): string[] {
  pythonMethodRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pythonMethodRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractPythonProperties(content: string): string[] {
  pythonPropertyRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pythonPropertyRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

const kotlinMethodRe =
  /(?:(?:public|private|protected|internal|suspend|inline|open|override)\s+)*fun\s+(\w+)\s*[(<]/gm;
const kotlinPropertyRe =
  /(?:(?:public|private|protected|internal|lateinit)\s+)*(?:val|var)\s+(\w+)/gm;

function extractKotlinMethods(content: string): string[] {
  kotlinMethodRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = kotlinMethodRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractKotlinProperties(content: string): string[] {
  kotlinPropertyRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = kotlinPropertyRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

const goPropertyRe = /^\s+(\w+)\s+\w+/gm;

function extractGoProperties(content: string): string[] {
  goPropertyRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = goPropertyRe.exec(content)) !== null) {
    const name = m[1];
    if (name[0] === name[0].toUpperCase()) {
      out.push(name);
    }
  }
  return out;
}

const rustMethodRe = /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*[(<]/gm;
const rustPropertyRe = /^\s+(\w+)\s*:/gm;

function extractRustMethods(content: string): string[] {
  rustMethodRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rustMethodRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractRustProperties(content: string): string[] {
  rustPropertyRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rustPropertyRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

const csharpPropertyRe =
  /(?:(?:public|private|protected|internal|static|readonly|virtual|override|sealed|abstract)\s+)+(?:\w+(?:<[^>]+>)?(?:\[\])?\s+)(\w+)\s*[;{]/gm;

function extractCsharpProperties(content: string): string[] {
  csharpPropertyRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = csharpPropertyRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

const phpMethodRe = /(?:public|private|protected)\s+(?:static\s+)?function\s+(\w+)\s*\(/gm;
const phpPropertyRe = /(?:public|private|protected)\s+(?:\w+\s+)?\$(\w+)/gm;

function extractPhpMethods(content: string): string[] {
  phpMethodRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = phpMethodRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractPhpProperties(content: string): string[] {
  phpPropertyRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = phpPropertyRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

const rubyMethodRe = /def\s+(?:self\.)?(\w+)/gm;
const rubyAttrRe = /:(\w+)/g;

function extractRubyMethods(content: string): string[] {
  rubyMethodRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rubyMethodRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractRubyProperties(content: string): string[] {
  const out: string[] = [];
  const lineRe = /attr_(?:accessor|reader|writer)\s+(.+)/gm;
  lineRe.lastIndex = 0;
  let line: RegExpExecArray | null;
  while ((line = lineRe.exec(content)) !== null) {
    const args = line[1];
    rubyAttrRe.lastIndex = 0;
    let sym: RegExpExecArray | null;
    while ((sym = rubyAttrRe.exec(args)) !== null) {
      out.push(sym[1]);
    }
  }
  return out;
}

const swiftMethodRe =
  /(?:(?:public|private|internal|open|fileprivate|static|class|override)\s+)*func\s+(\w+)\s*[(<]/gm;
const swiftPropertyRe =
  /(?:(?:public|private|internal|open|fileprivate|static|class|override)\s+)*(?:var|let)\s+(\w+)\s*[:=]/gm;

function extractSwiftMethods(content: string): string[] {
  swiftMethodRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = swiftMethodRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractSwiftProperties(content: string): string[] {
  swiftPropertyRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = swiftPropertyRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

const cppMethodRe =
  /(?:(?:virtual|static|inline|explicit|constexpr|const)\s+)*(?:\w+(?:<[^>]+>)?(?:\s*\*\s*|\s*&\s*|\s+)\s*)(\w+)\s*\(/gm;
const cppPropertyRe =
  /(?:(?:public|private|protected)\s*:\s*)?(?:(?:static|const|mutable|volatile)\s+)*(?:std::)?(?:\w+(?:<[^>]+>)?(?:\s*\*\s*|\s*&\s*|\s+))(\w+)\s*[;=]/gm;

function extractCppMethods(content: string): string[] {
  cppMethodRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = cppMethodRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractCppProperties(content: string): string[] {
  cppPropertyRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = cppPropertyRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

const dartMethodRe =
  /(?:(?:static|async|factory)\s+)*(?:\w+(?:<[^>]+>)?(?:\?)?(?:\s*\(\))?\s+)?(\w+)\s*\(/gm;
const dartPropertyRe =
  /(?:(?:final|late|static|const)\s+)*(?:\w+(?:<[^>]+>)?)?\??\s+(?:<[^>]+>\s+)?(\w+)\s*[;=]/gm;

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

const jsMethodRe = /(?:(?:async|static|get|set)\s+)*(?:\w+(?:<[^>]+>)?(?:\[\])?\s+)?(\w+)\s*\(/gm;
const jsPropertyRe = /this\.(\w+)\s*=/gm;

function extractJsMethods(content: string): string[] {
  jsMethodRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = jsMethodRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractJsProperties(content: string): string[] {
  jsPropertyRe.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = jsPropertyRe.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

export const PATTERNS: Record<string, LanguagePatterns> = {
  typescript: {
    extractMethods: extractTsMethods,
    extractProperties: extractTsProperties,
  },
  javascript: {
    extractMethods: extractJsMethods,
    extractProperties: extractJsProperties,
  },
  python: {
    extractMethods: extractPythonMethods,
    extractProperties: extractPythonProperties,
  },
  java: {
    extractMethods: cStyleMethods('public|private|protected|static'),
    extractProperties: cStyleProperties('\\w+(?:<[^>]+>)?(?:\\[\\])?'),
  },
  kotlin: {
    extractMethods: extractKotlinMethods,
    extractProperties: extractKotlinProperties,
  },
  go: {
    extractMethods: () => [],
    extractProperties: extractGoProperties,
  },
  rust: {
    extractMethods: extractRustMethods,
    extractProperties: extractRustProperties,
  },
  csharp: {
    extractMethods: cStyleMethods(
      'public|private|protected|internal|static|virtual|override|async',
    ),
    extractProperties: extractCsharpProperties,
  },
  php: {
    extractMethods: extractPhpMethods,
    extractProperties: extractPhpProperties,
  },
  ruby: {
    extractMethods: extractRubyMethods,
    extractProperties: extractRubyProperties,
  },
  swift: {
    extractMethods: extractSwiftMethods,
    extractProperties: extractSwiftProperties,
  },
  cpp: {
    extractMethods: extractCppMethods,
    extractProperties: extractCppProperties,
  },
  c: {
    extractMethods: extractCppMethods,
    extractProperties: extractCppProperties,
  },
  dart: {
    extractMethods: extractDartMethods,
    extractProperties: extractDartProperties,
  },
};

export function getPatternsForLanguage(language: string): LanguagePatterns | undefined {
  return PATTERNS[language];
}
