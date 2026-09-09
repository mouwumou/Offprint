import { FsStore, GitStore, type ContentStore } from '../store'
import siteConfig from '../config/current'
import { createProvider, type ContentProvider } from './provider'

let store: ContentStore | undefined
let provider: ContentProvider | undefined

/** The byte-level store behind the provider (health endpoint, watch wiring). */
export function getStore(): ContentStore {
  if (store === undefined) {
    const storeKind = process.env.CONTENT_STORE ?? 'fs'
    if (storeKind === 'fs') {
      store = new FsStore(process.env.CONTENT_DIR ?? 'content')
    } else if (storeKind === 'git') {
      const spec = process.env.CONTENT_GIT_REPO ?? ''
      const [repo, branch] = spec.split('#')
      if (!repo) throw new Error('CONTENT_STORE=git requires CONTENT_GIT_REPO=owner/repo[#branch]')
      store = new GitStore({
        repo,
        branch,
        dir: process.env.CONTENT_GIT_DIR ?? 'content',
        token: process.env.GITHUB_TOKEN,
      })
    } else {
      throw new Error(`CONTENT_STORE=${storeKind} is not implemented yet (s3 lands later)`)
    }
  }
  return store
}

/**
 * The provider instance pages use (constraint 1). Static mode calls it during
 * the build, server mode per request; both read CONTENT_DIR (default ./content).
 * git / s3 stores land in phase 2 (ADR-004).
 */
export function getProvider(): ContentProvider {
  provider ??= createProvider(getStore(), {
    publicationOrder: siteConfig.modules.publications.order,
  })
  return provider
}

export { createProvider } from './provider'
export type {
  ContentProvider,
  NewsItem,
  Page,
  PageSummary,
  Post,
  PostSummary,
  Profile,
  Publication,
  Resume,
} from './provider'
