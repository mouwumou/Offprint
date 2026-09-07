// Ambient declarations for untyped dependencies.

// Inlined by astro.config `define` — see the middleware comment.
interface ImportMetaEnv {
  readonly RUNTIME_MODE: 'static' | 'server'
}

declare module '@citation-js/core' {
  export class Cite {
    constructor(data: unknown)
    format(type: string, options?: Record<string, unknown>): unknown
  }
  export const plugins: { config: { get(name: string): unknown } }
}

declare module '@citation-js/plugin-csl' {}

declare module '*.csl?raw' {
  const content: string
  export default content
}
