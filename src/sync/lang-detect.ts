// Lightweight language detection: the maintainer keeps no lang
// column in Notion, so sync derives it. A CJK-ratio heuristic is the
// "轻量检测器" option; an LLM pipeline may replace it later without touching
// the contract.

const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/g
const LATIN = /[a-zA-Z]/g

export function detectLang(text: string, fallback: string): { lang: string; detected: boolean } {
  const sample = text.slice(0, 4000)
  const cjk = (sample.match(CJK) ?? []).length
  const latin = (sample.match(LATIN) ?? []).length
  const total = cjk + latin
  if (total < 20) return { lang: fallback, detected: false }
  // CJK is information-dense: even a modest share means a Chinese document.
  if (cjk / total > 0.15) return { lang: 'zh', detected: true }
  return { lang: 'en', detected: true }
}
