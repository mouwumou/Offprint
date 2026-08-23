import { useState } from 'react'

// One of the few true islands (constraint 6). The anti-flash inline script in
// BaseLayout has already applied the stored/system theme class before paint;
// this button only toggles and persists it.
export default function ThemeToggle({ label }: { label: string }) {
  const [dark, setDark] = useState(() =>
    typeof document === 'undefined' ? false : document.documentElement.classList.contains('dark'),
  )

  const toggle = (): void => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      /* private mode */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <span className="font-mono text-xs" aria-hidden="true">
        {dark ? '☾' : '☀'}
      </span>
    </button>
  )
}
