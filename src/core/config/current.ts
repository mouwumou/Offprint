// The single place src/core reads the site's configuration (site.yaml +
// content/home.yaml, parsed once at build/startup). When core is
// extracted to @offprint/core, this becomes a virtual module
// provided by the integration.
import { loadSiteConfig } from './load'

export default loadSiteConfig()
