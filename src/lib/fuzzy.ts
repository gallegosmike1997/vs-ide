// ---------------------------------------------------------------------------
// Tiny fuzzy matcher for the pickers (command palette, go to symbol, quick open).
//
// Subsequence match, the way VS Code's pickers feel: characters must appear in
// order, but not necessarily side by side. Bonuses for consecutive characters,
// word boundaries and short labels; null means "no match".
// ---------------------------------------------------------------------------

const BOUNDARY = /[\s/\\.\-_:>]/;

/** Higher is better. Returns null when `query` is not a subsequence of `text`. */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const t = text.toLowerCase();
  let ti = 0;
  let score = 0;
  let streak = 0;
  let last = -1;

  for (const ch of q) {
    if (ch === " ") continue;           // spaces in the query are free
    const at = t.indexOf(ch, ti);
    if (at === -1) return null;
    if (at === last + 1) {
      streak += 1;
      score += 5 + streak * 1.5;        // consecutive run, e.g. "gop" in "goto"
    } else {
      streak = 0;
      score += 2;
    }
    if (at === 0) score += 6;           // matched right at the start
    else if (BOUNDARY.test(t[at - 1])) score += 9;   // start of a word
    if (at > ti) score -= Math.min(8, at - ti) * 0.8;  // gap penalty: a match
                                                      // far into the string is weak
    ti = at + 1;
    last = at;
  }
  return score - t.length * 0.01;        // mild preference for shorter labels
}

export type FuzzyHit<T> = { item: T; score: number };

/** Rank `items` against `query`, best first. Ties keep the original order. */
export function fuzzyFilter<T>(items: T[], query: string, toText: (item: T) => string): FuzzyHit<T>[] {
  const hits: FuzzyHit<T>[] = [];
  items.forEach((item, i) => {
    const score = fuzzyScore(query, toText(item));
    if (score !== null) hits.push({ item, score: score - i * 0.0001 });
  });
  return hits.sort((a, b) => b.score - a.score);
}

/** Cap the work for very long lists (pickers only ever show a screenful). */
export function fuzzyFilterTop<T>(items: T[], query: string, toText: (item: T) => string, limit = 200): FuzzyHit<T>[] {
  return fuzzyFilter(items, query, toText).slice(0, limit);
}
