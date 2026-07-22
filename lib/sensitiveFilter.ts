/**
 * Module 1 — Sensitive-word filter (DFA / trie based).
 *
 * A Deterministic-Finite-Automaton (trie) matcher for high-performance
 * sensitive-word detection. Built for a children's platform, so it defends
 * against the common evasion tricks:
 *
 *  - special-symbol insertion / splitting:  f*u*c*k   傻__逼   加  微  信
 *  - full-width characters:                 ｆｕｃｋ
 *  - case + leet substitution:              FuCk   f0ck   $hit   sb
 *  - Chinese + English mixed text
 *
 * Homophone (谐音) coverage is dictionary-driven: add the known variants to
 * the word list. A light leet/look-alike normalization layer catches the most
 * common symbol swaps automatically.
 *
 * Public API:
 *   filter.contains(text)               -> boolean
 *   filter.filter(text, replacement?)   -> masked string
 *   filter.findAll(text)                -> { word, start, end }[]
 */

export type Match = { word: string; start: number; end: number };

// Characters that carry no meaning and are commonly inserted to dodge filters.
// While mid-word, the matcher skips over them.
const NOISE = new Set([
  " ", "\t", "\n", "\r", "　",
  ".", ",", "·", "•", "-", "_", "=", "+", "*", "~", "^", "|", "/", "\\",
  "'", '"', "`", "…", "、", "，", "。", "！", "？", "@", "#", "%", "&",
  "(", ")", "[", "]", "{", "}", "<", ">", "　",
]);

// Look-alike / leet substitutions → canonical letter.
const CANON: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
  "9": "g", "@": "a", "$": "s", "!": "i",
};

/** Normalize a single character: full-width→half-width, lower-case, de-leet. */
function normChar(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 0xff01 && code <= 0xff5e) ch = String.fromCharCode(code - 0xfee0);
  else if (code === 0x3000) ch = " ";
  ch = ch.toLowerCase();
  return CANON[ch] ?? ch;
}

type TrieNode = {
  children: Map<string, TrieNode>;
  end: boolean;
};

export class SensitiveFilter {
  private root: TrieNode = { children: new Map(), end: false };

  constructor(words: string[] = []) {
    this.addWords(words);
  }

  addWords(words: string[]): void {
    for (const raw of words) {
      const word = raw.trim();
      if (!word) continue;
      let node = this.root;
      for (const ch of word) {
        if (NOISE.has(ch)) continue; // never store noise inside a word
        const c = normChar(ch);
        let next = node.children.get(c);
        if (!next) {
          next = { children: new Map(), end: false };
          node.children.set(c, next);
        }
        node = next;
      }
      node.end = true;
    }
  }

  /**
   * Try to match a sensitive word starting at index `start`.
   * Returns the exclusive end index of the longest match, or -1.
   */
  private matchFrom(text: string, start: number): number {
    let node = this.root;
    let j = start;
    let end = -1;
    while (j < text.length) {
      const raw = text[j];
      if (NOISE.has(raw)) {
        if (node === this.root) break; // can't start / restart on noise
        j++;
        continue; // skip inserted noise while mid-word
      }
      const next = node.children.get(normChar(raw));
      if (!next) break;
      node = next;
      j++;
      if (node.end) end = j; // remember the longest word ending here
    }
    return end;
  }

  /** Fast boolean check. */
  contains(text: string): boolean {
    if (!text) return false;
    for (let i = 0; i < text.length; i++) {
      if (NOISE.has(text[i])) continue;
      if (this.matchFrom(text, i) !== -1) return true;
    }
    return false;
  }

  /** All non-overlapping matches, left to right. */
  findAll(text: string): Match[] {
    const out: Match[] = [];
    if (!text) return out;
    for (let i = 0; i < text.length; i++) {
      if (NOISE.has(text[i])) continue;
      const end = this.matchFrom(text, i);
      if (end !== -1) {
        out.push({ word: text.slice(i, end), start: i, end });
        i = end - 1; // non-overlapping: jump past this match
      }
    }
    return out;
  }

  /** Replace every matched span with `replacement` (repeated to span length). */
  filter(text: string, replacement = "*"): string {
    const matches = this.findAll(text);
    if (matches.length === 0) return text;
    let result = "";
    let cursor = 0;
    for (const m of matches) {
      result += text.slice(cursor, m.start);
      result += replacement.repeat(Math.max(1, m.end - m.start));
      cursor = m.end;
    }
    result += text.slice(cursor);
    return result;
  }
}

/**
 * Starter seed list — intentionally small and structured by category.
 * Replace / extend with a maintained corpus in production (many open,
 * regularly-updated Chinese + English lists exist). The point of Module 1
 * is the engine; the wordlist is data you own and tune.
 */
export const seedWords: string[] = [
  // English profanity / abuse
  "fuck", "shit", "bitch", "asshole", "dick", "cunt", "bastard", "retard",
  // Chinese profanity / abuse
  "操你", "草泥马", "傻逼", "煞笔", "sb", "智障", "去死", "滚蛋", "废物", "贱人",
  // Bullying / self-harm cues (child-safety critical)
  "杀了你", "打死你", "自杀", "kill yourself", "kys",
  // Off-platform contact solicitation (the real risk on a kids platform)
  "加微信", "加威信", "加vx", "加v信", "加qq", "私下联系", "线下见面", "单独见面",
  "add me on wechat", "add my whatsapp", "私聊我", "偷偷告诉你",
];

/** Shared default instance seeded for the MoliVerse platform. */
export const defaultFilter = new SensitiveFilter(seedWords);
