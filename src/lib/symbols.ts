// ---------------------------------------------------------------------------
// Lightweight symbol extraction (outline + breadcrumbs).
//
// Deliberately regex-based: no parser dependency, works on any language, and
// never throws on half-written code. Good enough to navigate a file, which is
// what an outline is for. A real parser can replace this later without
// changing the call sites.
// ---------------------------------------------------------------------------

export type SymbolKind = "class" | "function" | "method" | "interface" | "type" | "enum" | "const" | "variable" | "section";

export type Symbol = {
  name: string;
  kind: SymbolKind;
  line: number;       // 1-based
  depth: number;      // 0 = top level
  container?: string; // owning class / object, when known
};

export const SYMBOL_ICON: Record<SymbolKind, string> = {
  class: "◈",
  interface: "◇",
  enum: "▤",
  type: "◈",
  function: "ƒ",
  method: "ƒ",
  const: "▸",
  variable: "・",
  section: "§",
};

type Pattern = { re: RegExp; kind: SymbolKind };

/** Ordered: first match wins, so the more specific forms come first. */
function patternsFor(language: string): Pattern[] {
  const js: Pattern[] = [
    { re: /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/, kind: "class" },
    { re: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/, kind: "interface" },
    { re: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*[=<]/, kind: "type" },
    { re: /^\s*(?:export\s+)?enum\s+([A-Za-z_$][\w$]*)/, kind: "enum" },
    { re: /^\s*(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/, kind: "function" },
    { re: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/, kind: "function" },
    { re: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/, kind: "const" },
    { re: /^\s{2,}(?:public\s+|private\s+|protected\s+|static\s+|async\s+|readonly\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*[:{]/, kind: "method" },
    { re: /^\s{2,}(?:public\s+|private\s+|protected\s+|static\s+|readonly\s+)+([A-Za-z_$][\w$]*)\s*[:=]/, kind: "variable" },
  ];
  const py: Pattern[] = [
    { re: /^\s*class\s+([A-Za-z_]\w*)/, kind: "class" },
    { re: /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/, kind: "function" },
    { re: /^\s*([A-Z_][A-Z0-9_]*)\s*=/, kind: "const" },
  ];
  const rust: Pattern[] = [
    { re: /^\s*(?:pub\s+)?(?:unsafe\s+)?struct\s+([A-Za-z_]\w*)/, kind: "class" },
    { re: /^\s*(?:pub\s+)?enum\s+([A-Za-z_]\w*)/, kind: "enum" },
    { re: /^\s*(?:pub\s+)?trait\s+([A-Za-z_]\w*)/, kind: "interface" },
    { re: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)/, kind: "function" },
    { re: /^\s*(?:pub\s+)?(?:const|static)\s+([A-Za-z_]\w*)/, kind: "const" },
  ];
  const go: Pattern[] = [
    { re: /^\s*type\s+([A-Za-z_]\w*)\s+struct/, kind: "class" },
    { re: /^\s*type\s+([A-Za-z_]\w*)\s+interface/, kind: "interface" },
    { re: /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/, kind: "function" },
    { re: /^\s*(?:const|var)\s+([A-Za-z_]\w*)/, kind: "const" },
  ];
  const java: Pattern[] = [
    { re: /^\s*(?:public\s+|private\s+|protected\s+|final\s+|abstract\s+|static\s+)*class\s+([A-Za-z_]\w*)/, kind: "class" },
    { re: /^\s*(?:public\s+|private\s+|protected\s+)*interface\s+([A-Za-z_]\w*)/, kind: "interface" },
    { re: /^\s*(?:public\s+|private\s+|protected\s+|static\s+|final\s+|synchronized\s+)+[\w<>\[\],.\s]+\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*(?:throws [\w,\s.]+)?\{/, kind: "method" },
  ];
  const rb: Pattern[] = [
    { re: /^\s*class\s+([A-Za-z_]\w*)/, kind: "class" },
    { re: /^\s*module\s+([A-Za-z_]\w*)/, kind: "interface" },
    { re: /^\s*(?:def|alias)\s+([A-Za-z_]\w*[?!]?)/, kind: "function" },
  ];
  const cs: Pattern[] = [
    { re: /^\s*(?:public\s+|internal\s+|sealed\s+|abstract\s+|static\s+)*class\s+([A-Za-z_]\w*)/, kind: "class" },
    { re: /^\s*(?:public\s+)?interface\s+([A-Za-z_]\w*)/, kind: "interface" },
    { re: /^\s*(?:public\s+|private\s+|protected\s+|internal\s+|static\s+|async\s+)+[\w<>\[\],.\s]+\s+([A-Za-z_]\w*)\s*\([^)]*\)/, kind: "method" },
  ];
  const c: Pattern[] = [
    { re: /^\s*(?:typedef\s+)?(?:struct|union)\s+([A-Za-z_]\w*)/, kind: "class" },
    { re: /^\s*#\s*define\s+([A-Za-z_]\w*)/, kind: "const" },
    { re: /^[A-Za-z_][\w\s*]*\s+\**([A-Za-z_]\w*)\s*\([^;]*\)\s*\{/, kind: "function" },
  ];
  const css: Pattern[] = [
    { re: /^\s*([.#][\w-]+[^{]*) \{/, kind: "section" },
    { re: /^\s*@(media|supports|keyframes)[^{]*/, kind: "section" },
  ];
  const md: Pattern[] = [{ re: /^(#{1,6})\s+(.*)$/, kind: "section" }];
  const sh: Pattern[] = [
    { re: /^\s*(?:function\s+)?([A-Za-z_]\w*)\s*\(\s*\)\s*\{/, kind: "function" },
    { re: /^\s*([A-Za-z_]\w*)\s*=\s*/, kind: "variable" },
  ];
  const sql: Pattern[] = [
    { re: /^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|VIEW|FUNCTION|PROCEDURE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+)/i, kind: "class" },
  ];

  switch (language) {
    case "typescript": case "javascript": case "typescriptreact": case "javascriptreact": return js;
    case "python": return py;
    case "rust": return rust;
    case "go": return go;
    case "java": return java;
    case "ruby": return rb;
    case "csharp": return cs;
    case "c": case "cpp": return c;
    case "css": case "scss": case "less": return css;
    case "markdown": return md;
    case "shell": case "bash": return sh;
    case "sql": return sql;
    default: return [...js, ...py];
  }
}


/**
 * Pull every symbol out of a buffer. Cheap enough to run on each keystroke for
 * normal file sizes (single pass, no backtracking-prone patterns).
 */
export function extractSymbols(code: string, language: string): Symbol[] {
  if (!code) return [];
  const pats = patternsFor(language);
  const lines = code.split("\n");
  const out: Symbol[] = [];
  // Track the enclosing class so methods can be grouped in the outline.
  let container: string | undefined;
  let containerDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;

    for (const p of pats) {
      const m = p.re.exec(line);
      if (!m) continue;
      let name = (m[1] || "").trim();
      if (!name) break;
      // Markdown headings capture the text in group 2.
      if (p.kind === "section" && line.trim().startsWith("#")) name = (m[2] || m[1] || "").trim();
      const indent = (line.match(/^\s*/)?.[0] || "").replace(/\t/g, "  ").length;
      const depth = Math.min(3, Math.floor(indent / 2));
      if (p.kind === "class" || p.kind === "interface" || p.kind === "enum") {
        container = name;
        containerDepth = braceDepth;
      }
      out.push({ name, kind: p.kind, line: i + 1, depth, container: indent > 0 ? container : undefined });
      break;
    }

    braceDepth += opens - closes;
    if (container && braceDepth <= containerDepth) container = undefined;
  }
  // Cap so pathological files can't blow up the DOM.
  return out.slice(0, 500);
}

/** Outline rows, in file order. */
export function outlineRows(symbols: Symbol[]): Symbol[] {
  return symbols.slice().sort((a, b) => a.line - b.line);
}

/** Nearest enclosing symbol chain for a line (used by the breadcrumb bar). */
export function breadcrumbSymbols(symbols: Symbol[], line: number): Symbol[] {
  const before = symbols.filter((s) => s.line <= line);
  if (!before.length) return [];
  const innermost = before[before.length - 1];
  const chain: Symbol[] = [innermost];
  if (innermost.container) {
    const owner = symbols.find((s) => s.name === innermost.container && s.line <= line);
    if (owner) chain.unshift(owner);
  }
  return chain;
}

/** Path parts for the breadcrumb bar ("src/lib/fs.ts" -> ["src","lib","fs.ts"]). */
export function pathParts(label: string): string[] {
  return String(label || "").replace(/\\/g, "/").split("/").filter(Boolean);
}
