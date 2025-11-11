type RuntimeConfig = {
  API_BASE_URL?: string
  API_REQUEST_BASE?: string
  DISPLAY_API_URL?: string
}

declare global {
  interface Window {
    __CVEA_CONFIG__?: RuntimeConfig
  }
}

const runtimeConfig: RuntimeConfig | undefined = typeof window !== 'undefined' ? window.__CVEA_CONFIG__ : undefined

const displayFallback =
  import.meta.env.VITE_DISPLAY_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://api.deepexo.eu.org/api'
const requestFallback = import.meta.env.VITE_API_REQUEST_BASE || import.meta.env.VITE_API_BASE_URL || '/api'

const sanitizeBase = (value: string | undefined, fallback: string) => {
  if (!value) return fallback
  if (!value.startsWith('http')) {
    return value.startsWith('/') ? value.replace(/\/$/, '') : `/${value}`.replace(/\/$/, '')
  }
  return value.replace(/\/$/, '')
}

export const API_BASE_URL = sanitizeBase(runtimeConfig?.API_REQUEST_BASE || runtimeConfig?.API_BASE_URL, requestFallback)

export const DISPLAY_API_URL = sanitizeBase(runtimeConfig?.DISPLAY_API_URL || runtimeConfig?.API_BASE_URL, displayFallback)
