// The resolved theme of THIS site, for components that branch on voice
// (A3). Kept separate from resolve.ts so the resolver stays config-free.
import config from '../config/current'
import { resolveTheme } from './resolve'

export const currentTheme = resolveTheme(config.theme.name).manifest
export const themeVoice = currentTheme.voice
