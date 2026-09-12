// Documentation site (Starlight). Source of truth is docs/**/*.md in this
// repository; website/collect.mjs copies and adapts them into
// website/src/content/docs/ before every build (that directory is generated
// and gitignored). Served under <site>/docs/ next to the demo site:
//   DOCS_SITE_URL=https://user.github.io/Offprint  →  site origin + base /Offprint/docs
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

const siteUrl = new URL(process.env.DOCS_SITE_URL ?? 'http://localhost:4321/')
const base = `${siteUrl.pathname.replace(/\/+$/, '')}/docs`

export default defineConfig({
  site: siteUrl.origin,
  base,
  outDir: './dist',
  integrations: [
    starlight({
      title: 'Offprint',
      description:
        'An academic personal website you write in Notion and deploy anywhere: static on GitHub Pages, or server-rendered in a container.',
      defaultLocale: 'root',
      locales: {
        root: { label: '简体中文', lang: 'zh-CN' },
        en: { label: 'English', lang: 'en' },
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/mouwumou/Offprint' }],
      editLink: { baseUrl: 'https://github.com/mouwumou/Offprint/edit/dev/docs/' },
      sidebar: [
        {
          label: '使用指南',
          translations: { en: 'Guides' },
          items: [
            { slug: 'guide/getting-started' },
            { slug: 'guide/configuration' },
            { slug: 'guide/notion-template' },
            { slug: 'guide/sync' },
            { slug: 'guide/deployment' },
          ],
        },
        {
          label: '主题',
          translations: { en: 'Theming' },
          items: [{ slug: 'theming' }],
        },
        {
          label: '设计文档',
          translations: { en: 'Design documents' },
          items: [
            { slug: 'architecture' },
            { slug: 'content-contract' },
            { slug: 'dynamic-publishing' },
            { slug: 'decisions' },
          ],
        },
      ],
    }),
  ],
})
