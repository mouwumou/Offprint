import { z } from 'zod'

const pathString = z.string().regex(/^\//, 'redirect paths must start with /')

/**
 * redirects.yaml (P1-10, ADR-009): map of old path → new path or
 * { destination, status }. Fed to Astro's `redirects` config, which emits
 * meta-refresh pages for static hosts, native rules for Vercel/Netlify/CF
 * adapters, and real 30x responses under the node adapter.
 */
export const redirectsSchema = z.record(
  pathString,
  z.union([
    pathString.or(z.url()),
    z.strictObject({
      destination: pathString.or(z.url()),
      status: z.union([z.literal(300), z.literal(301), z.literal(302), z.literal(303), z.literal(304), z.literal(307), z.literal(308)]),
    }),
  ]),
)

export type Redirects = z.output<typeof redirectsSchema>
