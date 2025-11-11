;(function () {
  const fallbackDisplay = 'https://api.deepexo.eu.org/api'
  const fallbackRequest = '/api'
  const apiBase = '__API_BASE_URL__'
  const apiRequest = '__API_REQUEST_BASE__'
  const displayValue = apiBase !== '__API_BASE_URL__' ? apiBase : fallbackDisplay
  const requestValue = apiRequest !== '__API_REQUEST_BASE__' ? apiRequest : fallbackRequest
  window.__CVEA_CONFIG__ = window.__CVEA_CONFIG__ || {}
  window.__CVEA_CONFIG__.API_BASE_URL = displayValue
  window.__CVEA_CONFIG__.DISPLAY_API_URL = displayValue
  window.__CVEA_CONFIG__.API_REQUEST_BASE = requestValue
})()
