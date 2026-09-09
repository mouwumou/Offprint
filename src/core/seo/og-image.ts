import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import siteConfig from '../config/current'
import { resolveLocalized, type Profile } from '../schema'

// OG card generation (P3-4): satori (layout → SVG) + resvg (SVG → PNG),
// entirely server-side. Static builds prerender the endpoint into PNG files;
// server mode renders on demand with an in-memory cache. Latin fonts only for
// now — CJK subsetting is the P3-7 follow-up.

const require = createRequire(import.meta.url)

function font(pkgPath: string): Buffer {
  return readFileSync(require.resolve(pkgPath))
}

interface OgFont {
  name: string
  data: Buffer
  weight: 400 | 600
  style: 'normal'
}

let fonts: OgFont[] | undefined
let cjkFonts: OgFont[] | undefined

function getFonts(needsCjk: boolean): OgFont[] {
  fonts ??= [
    {
      name: 'Newsreader',
      data: font('@fontsource/newsreader/files/newsreader-latin-600-normal.woff'),
      weight: 600,
      style: 'normal',
    },
    {
      name: 'JetBrains Mono',
      data: font('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff'),
      weight: 400,
      style: 'normal',
    },
  ]
  if (!needsCjk) return fonts
  // Loaded only for CJK text (P3-7). Satori only falls back across fonts
  // with DIFFERENT family names — registering the CJK face under the latin
  // families does nothing (measured), so it gets its own name.
  cjkFonts ??= [
    ...fonts,
    {
      name: 'Noto Sans SC',
      data: font('@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-600-normal.woff'),
      weight: 600,
      style: 'normal',
    },
    {
      name: 'Noto Sans SC',
      data: font('@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff'),
      weight: 400,
      style: 'normal',
    },
  ]
  return cjkFonts
}

export interface OgCard {
  title: string
  kicker?: string | undefined
  date?: string | undefined
  lang: string
}

const el = (
  type: string,
  style: Record<string, unknown>,
  children: unknown,
): Record<string, unknown> => ({ type, props: { style, children } })

export async function renderOgImage(card: OgCard, profile: Profile): Promise<Buffer> {
  const name = resolveLocalized(profile.name, card.lang, siteConfig.i18n.default) ?? 'Offprint'
  const field = resolveLocalized(profile.field, card.lang, siteConfig.i18n.default)
  const titleSize = card.title.length > 70 ? 52 : card.title.length > 40 ? 60 : 72

  const tree = el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: '#faf8f3',
      color: '#1c1a16',
      padding: '64px 72px 0',
    },
    [
      el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }, [
        el(
          'div',
          {
            fontFamily: 'JetBrains Mono',
            fontSize: 26,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: '#6f2232',
          },
          name,
        ),
        el(
          'div',
          {
            fontFamily: 'JetBrains Mono',
            fontSize: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#6c675c',
          },
          field?.split(/\s*[&＆]\s*/)[0] ?? '',
        ),
      ]),
      el(
        'div',
        {
          fontFamily: 'Newsreader',
          fontSize: titleSize,
          fontWeight: 600,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          lineClamp: 3,
        },
        card.title,
      ),
      el('div', { display: 'flex', flexDirection: 'column' }, [
        el(
          'div',
          {
            display: 'flex',
            gap: 28,
            fontFamily: 'JetBrains Mono',
            fontSize: 22,
            color: '#6c675c',
            paddingBottom: 40,
          },
          [
            ...(card.kicker
              ? [
                  el(
                    'div',
                    {
                      color: '#6f2232',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                    },
                    card.kicker,
                  ),
                ]
              : []),
            ...(card.date ? [el('div', {}, card.date)] : []),
          ],
        ),
        el('div', { height: 14, backgroundColor: '#6f2232', margin: '0 -72px' }, undefined),
      ]),
    ],
  )

  const needsCjk = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/.test(`${card.title}${card.kicker ?? ''}${name}`)
  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: getFonts(needsCjk) as never,
  })
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng())
}
