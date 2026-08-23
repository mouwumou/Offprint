// MiniSearch's default tokenizer splits on spaces and punctuation only, so a
// Chinese sentence becomes one giant token and mid-sentence terms (工具链,
// 博客…) never match. Split Han runs into overlapping bigrams instead — the
// standard CJK trick — while latin/digit chunks pass through unchanged.
// MiniSearch applies the same tokenizer at index and query time, so a query
// like 不确定性 becomes 不确/确定/定性 and matches its bigrams.

const SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}]+/u
const HAN = /\p{Script=Han}/u
const SEGMENTS = /\p{Script=Han}+|[^\p{Script=Han}]+/gu

export function tokenizeCjk(text: string): string[] {
  const tokens: string[] = []
  for (const chunk of text.split(SPACE_OR_PUNCTUATION)) {
    if (chunk === '') continue
    if (!HAN.test(chunk)) {
      tokens.push(chunk)
      continue
    }
    for (const segment of chunk.match(SEGMENTS) ?? []) {
      if (!HAN.test(segment)) {
        tokens.push(segment)
      } else if (segment.length === 1) {
        tokens.push(segment)
      } else {
        for (let i = 0; i < segment.length - 1; i++) {
          tokens.push(segment.slice(i, i + 2))
        }
      }
    }
  }
  return tokens
}
