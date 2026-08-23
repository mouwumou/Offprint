import { z } from 'zod'
import { coverSource } from './common'
import { localizedString } from './localized'

export const projectStatusSchema = z.enum(['active', 'maintained', 'archived'])

/** One entry of content/projects.yaml (CONTENT-CONTRACT §4). */
export const projectSchema = z
  .looseObject({
    name: z.string().min(1),
    /** One-liner; localized per ADR-007. */
    blurb: localizedString,
    /** A paragraph. */
    description: localizedString.optional(),
    tags: z.array(z.string()).default([]),
    /** Free-form range like "2023–now". */
    year: z.string().optional(),
    status: projectStatusSchema.default('active'),
    href: z.url().optional(),
    repo: z.url().optional(),
    image: coverSource.optional(),
  })
  .transform(({ name, blurb, description, tags, year, status, href, repo, image, ...extra }) => ({
    name,
    blurb,
    description,
    tags,
    year,
    status,
    href,
    repo,
    image,
    extra: extra as Record<string, unknown>,
  }))

export const projectsFileSchema = z.array(projectSchema)

export type Project = z.output<typeof projectSchema>
export type ProjectStatus = z.output<typeof projectStatusSchema>
