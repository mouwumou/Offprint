import { useRef, useState } from 'react'
import type { CitationFormats } from '../cite/formats'

interface Props {
  formats: CitationFormats
  labels: {
    cite: string
    copy: string
    copied: string
    close: string
  }
  /** mono-caps voice renders the paper-style uppercase mono chrome. */
  mono?: boolean
}

const ORDER: { key: keyof CitationFormats; label: string }[] = [
  { key: 'bibtex', label: 'BibTeX' },
  { key: 'apa', label: 'APA' },
  { key: 'mla', label: 'MLA' },
  { key: 'chicago', label: 'Chicago' },
]

// Cite dialog island (P3-1): all formats are prerendered server-side; the
// client only opens a <dialog> and copies text.
export default function CiteDialog({ formats, labels, mono = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (key: string, text: string): void => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={
          mono
            ? 'cursor-pointer rounded-md border border-border px-2.5 py-1 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:bg-secondary hover:text-foreground'
            : 'cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground'
        }
      >
        {labels.cite}
      </button>
      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto w-[min(42rem,calc(100vw-2rem))] rounded-md border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2
            className={
              mono
                ? 'font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase'
                : 'text-sm font-semibold text-muted-foreground'
            }
          >
            {labels.cite}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={labels.close}
            className="cursor-pointer font-mono text-sm text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
          {ORDER.map(({ key, label }) => (
            <section key={key}>
              <div className="flex items-baseline justify-between">
                <h3
                  className={
                    mono
                      ? 'font-mono text-[11px] tracking-[0.14em] text-primary uppercase'
                      : 'text-xs font-semibold text-primary'
                  }
                >
                  {label}
                </h3>
                <button
                  type="button"
                  onClick={() => copy(key, formats[key])}
                  className={
                    mono
                      ? 'cursor-pointer font-mono text-[11px] text-muted-foreground underline decoration-border underline-offset-4 hover:text-primary'
                      : 'cursor-pointer text-xs text-muted-foreground underline decoration-border underline-offset-4 hover:text-primary'
                  }
                >
                  {copied === key ? labels.copied : labels.copy}
                </button>
              </div>
              <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {formats[key]}
              </pre>
            </section>
          ))}
        </div>
      </dialog>
    </>
  )
}
