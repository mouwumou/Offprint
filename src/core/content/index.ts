import { FsStore, type ContentStore } from '../store'
import { createProvider, type ContentProvider } from './provider'

let store: ContentStore | undefined
let provider: ContentProvider | undefined

/** The byte-level store behind the provider (health endpoint, watch wiring). */
export function getStore(): ContentStore {
  if (store === undefined) {
    const storeKind = process.env.CONTENT_STORE ?? 'fs'
    if (storeKind !== 'fs') {
      throw new Error(`CONTENT_STORE=${storeKind} is not implemented yet; use fs`)
    }
    store = new FsStore(process.env.CONTENT_DIR ?? 'content')
  }
  return store
}

/**
 * The provider instance pages use (constraint 1). Static mode calls it during
 * the build, server mode per request; both read CONTENT_DIR (default ./content).
 * git / s3 stores land in phase 2 (ADR-004).
 */
export function getProvider(): ContentProvider {
  provider ??= createProvider(getStore())
  return provider
}

export { createProvider } from './provider'
export type {
  ContentProvider,
  Page,
  PageSummary,
  Post,
  PostSummary,
  Publication,
  Resume,
} from './provider'
