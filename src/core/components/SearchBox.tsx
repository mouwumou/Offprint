import { useEffect, useRef, useState } from 'react'

interface Hit {
  url: string
  title: string
  excerpt: string
}

interface PagefindApi {
  search(query: string): Promise<{
    results: { data(): Promise<{ url: string; excerpt: string; meta: { title?: string } }> }[]
  }>
}

interface Props {
  lang: string
  placeholder: string
  noResults: string
}

// One island, two backends (P2-9): a static deployment ships /pagefind/*
// (build-time index), a server deployment answers /api/search (MiniSearch).
// The backend is probed at runtime so both modes render identical HTML.
let pagefindPromise: Promise<PagefindApi | null> | undefined

function loadPagefind(): Promise<PagefindApi | null> {
  // The specifier must be a variable: esbuild strips the @vite-ignore comment
  // from .tsx, and a literal path would make Vite's import analysis try to
  // resolve this build-output-only asset (breaking `pnpm dev`).
  const runtimeOnlyPath = '/pagefind/pagefind.js'
  pagefindPromise ??= import(/* @vite-ignore */ runtimeOnlyPath)
    .then((module: PagefindApi) => module)
    .catch(() => null)
  return pagefindPromise
}

export default function SearchBox({ lang, placeholder, noResults }: Props) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    const q = query.trim()
    if (q.length === 0) {
      setHits([])
      setSearched(false)
      return
    }
    timer.current = setTimeout(() => {
      void (async () => {
        try {
          const pagefind = await loadPagefind()
          if (pagefind) {
            const result = await pagefind.search(q)
            const data = await Promise.all(result.results.slice(0, 10).map((r) => r.data()))
            setHits(
              data.map((d) => ({ url: d.url, title: d.meta.title ?? d.url, excerpt: d.excerpt })),
            )
          } else {
            const response = await fetch(
              `/api/search?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}`,
            )
            const body = (await response.json()) as { results?: Hit[] }
            // API excerpts are plain text; escape them since pagefind's
            // (trusted, <mark>-bearing) excerpts share the innerHTML path.
            const escape = (text: string) =>
              text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            setHits((body.results ?? []).map((hit) => ({ ...hit, excerpt: escape(hit.excerpt) })))
          }
        } catch {
          // Neither backend available (e.g. `pnpm dev`: the pagefind index
          // only exists in build output, /api/search only in server mode).
          setHits([])
        }
        setSearched(true)
      })()
    }, 200)
    return () => clearTimeout(timer.current)
  }, [query, lang])

  return (
    <div>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-card px-4 py-3 font-serif text-lg outline-none focus:ring-2 focus:ring-ring"
      />
      <ul className="mt-8 space-y-6">
        {hits.map((hit) => (
          <li key={hit.url}>
            <a href={hit.url} className="group block">
              <h2 className="font-serif text-xl leading-snug transition-colors group-hover:text-primary">
                {hit.title}
              </h2>
              <p
                className="mt-1 text-sm text-muted-foreground [&_mark]:bg-transparent [&_mark]:font-semibold [&_mark]:text-primary"
                dangerouslySetInnerHTML={{ __html: hit.excerpt }}
              />
            </a>
          </li>
        ))}
      </ul>
      {searched && hits.length === 0 && (
        <p className="mt-8 font-serif text-muted-foreground">
          {noResults.replace('{q}', query.trim())}
        </p>
      )}
    </div>
  )
}
