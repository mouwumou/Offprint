import { FsStore } from '../store'
import { createProvider, type ContentProvider } from './provider'

let provider: ContentProvider | undefined

/**
 * The provider instance pages use (constraint 1). Static mode calls it during
 * the build, server mode per request; both read CONTENT_DIR (default ./content).
 * git / s3 stores land in phase 2 (ADR-004).
 */
export function getProvider(): ContentProvider {
  if (provider === undefined) {
    const storeKind = process.env.CONTENT_STORE ?? 'fs'
    if (storeKind !== 'fs') {
      throw new Error(`CONTENT_STORE=${storeKind} is not implemented until phase 2; use fs`)
    }
    provider = createProvider(new FsStore(process.env.CONTENT_DIR ?? 'content'))
  }
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
