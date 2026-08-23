// Regenerates the local sample cover images (design-palette placeholder art).
// Usage: node scripts/generate-sample-covers.mjs
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const require = createRequire(import.meta.url)
const mono = readFileSync(
  require.resolve('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff'),
)

const el = (type, style, children) => ({ type, props: { style, children } })

async function cover(file, seed, label) {
  const cells = []
  let s = seed
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280
  for (let i = 0; i < 48; i++) {
    const shade = rand()
    cells.push(
      el('div', {
        width: 200,
        height: 150,
        backgroundColor:
          shade > 0.82 ? '#6f2232' : shade > 0.6 ? '#efece4' : shade > 0.3 ? '#f2efe8' : '#faf8f3',
        border: '1px solid #e4dfd4',
      }),
    )
  }
  const tree = el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexWrap: 'wrap',
      backgroundColor: '#faf8f3',
      position: 'relative',
    },
    [
      ...cells,
      el(
        'div',
        {
          position: 'absolute',
          bottom: 40,
          left: 48,
          fontFamily: 'JetBrains Mono',
          fontSize: 30,
          letterSpacing: '0.18em',
          color: '#6c675c',
          textTransform: 'uppercase',
          backgroundColor: '#faf8f3',
          padding: '10px 18px',
          border: '1px solid #e4dfd4',
        },
        label,
      ),
    ],
  )
  const svg = await satori(tree, {
    width: 1600,
    height: 900,
    fonts: [{ name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' }],
  })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1600 } }).render().asPng()
  writeFileSync(file, png)
  console.log(file, png.length, 'bytes')
}

mkdirSync('content/assets', { recursive: true })
await cover('content/assets/cover-geometry.png', 7, 'population codes')
await cover('content/assets/cover-notion.png', 23, 'notion → markdown')
