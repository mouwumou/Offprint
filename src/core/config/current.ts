// The single place src/core reads the site's configuration. When core is
// extracted to @offprint/core (phase 4), this file becomes a virtual module
// provided by the integration — nothing else in core may import site.config
// directly.
import siteConfig from '../../../site.config'

export default siteConfig
