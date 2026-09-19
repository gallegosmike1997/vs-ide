import { useMemo } from "react";
export function renderMarkdown(src: string): string {
  let html = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blocks: string[] = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const i = blocks.push(`<pre><code class="lang-${lang}">${code.trim()}</code></pre>`);
    return `\u0000BLOCK${i - 1}\u0000`;
  });
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^### (.*)$/gm, "<h4>$1</h4>").replace(/^## (.*)$/gm, "<h3>$1</h3>").replace(/^# (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  html = html.replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/^\s*\d+\. (.*)$/gm, "<li>$1</li>");
  html = html.split(/\n{2,}/).map((p) => {
    if (/^\s*<(pre|ul|h\d)/.test(p.trim())) return p;
    if (p.includes("\u0000BLOCK")) return p;
    return `<p>${p.replace(/\n/g, "<br/>")}</p>`;
  }).join("");
  blocks.forEach((b, i) => { html = html.replace(`\u0000BLOCK${i}\u0000`, b); });
  return html;
}
export function Markdown({ text }: { text: string }) {
  const html = useMemo(() => renderMarkdown(text), [text]);
  return (
    <div className="md" style={{ lineHeight: 1.6, fontSize: 12.5 }} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
export function extractCodeBlocks(src: string): string[] {
  const out: string[] = [];
  const re = /```\w*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1].trim());
  return out;
}
