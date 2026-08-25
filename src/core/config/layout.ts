// The one page-column class every page shares (site.yaml layout.width):
// uniform width across pages — including header and footer — so navigating
// never jumps the column.
import config from './current'

export const container =
  config.layout.width === 'narrow'
    ? 'mx-auto w-full max-w-[53rem] px-5 sm:px-8'
    : 'mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-12'
