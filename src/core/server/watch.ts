import { getProvider, getStore } from '../content'

let started = false

/**
 * Start the manifest watch once per server process: a manifest diff maps
 * straight onto provider.revalidate(changedKeys) (incremental invalidation,
 * P2-4). No-op outside server mode.
 */
export function ensureContentWatch(): void {
  if (started || import.meta.env.RUNTIME_MODE !== 'server') return
  started = true
  const store = getStore()
  store.watch?.((diff) => {
    const keys = [...diff.added, ...diff.changed, ...diff.removed]
    console.log(
      `[offprint] content changed (+${diff.added.length} ~${diff.changed.length} -${diff.removed.length}); revalidating`,
    )
    void getProvider().revalidate(keys)
  })
}
