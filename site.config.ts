import { defineConfig } from './src/core/config'

// Maintainer's site configuration. Template users edit this file (and only
// this file) to configure their own site; real profile data lands before
// launch (P1-16).
export default defineConfig({
  profile: {
    name: 'Q',
    nameVariants: ['Q'],
    email: 'mouwumou@gmail.com',
  },
  modules: {
    blog: true,
    pages: true,
    publications: true,
    projects: true,
    cv: true,
    talks: false,
    news: false,
  },
  i18n: {
    default: 'en',
    locales: ['en', 'zh'],
  },
  // theme: 'paper' preset with locked tokens (ADR-011); runtime: static + fs
  // store — both defaults, RUNTIME_MODE env overrides mode at build time.
})
