import { describe, expect, it } from 'vitest'
import { plainText } from './text'

describe('plainText (search excerpts, meta descriptions)', () => {
  it('drops code, math, images and directives but keeps link text', () => {
    const md = [
      '## Metrics',
      '',
      'Accuracy is $\\frac{TP+TN}{N}$ and see [the paper](https://x.y) for more.',
      '',
      '$$',
      'F_1 = 2 \\cdot \\frac{P R}{P + R}',
      '$$',
      '',
      '```python',
      'print(1)',
      '```',
      '',
      '![shot](assets/a.png)',
      ':::note{title="x"}',
      'inside',
      ':::',
    ].join('\n')
    expect(plainText(md)).toBe('Metrics Accuracy is and see the paper for more. inside')
  })

  it('strips list markers and table punctuation', () => {
    const md = '- Accuracy（准确率）\n1. first\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n'
    expect(plainText(md)).toBe('Accuracy（准确率） first a b 1 2')
  })

  it('removes footnote marks and stray HTML', () => {
    expect(plainText('Claim[^1] with <br> a break')).toBe('Claim with a break')
  })
})
