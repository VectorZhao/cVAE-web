import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import type { AlertColor } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'
import './App.css'
import ClassicPayloadForm from './components/forms/ClassicPayloadForm'
import GaussianPayloadForm from './components/forms/GaussianPayloadForm'
import FilePayloadForm from './components/forms/FilePayloadForm'
import CaseTabs from './components/dashboard/CaseTabs'
import ParameterGrid from './components/dashboard/ParameterGrid'
import { ParameterInsight } from './components/dashboard/ParameterCard'
import { DISPLAY_API_URL } from './config'
import { postJson, postFile, extractErrorMessage } from './api/cvae'
import type { PredictionResponse } from './api/cvae'
import { normalizePredictionCases } from './utils/distributions'
import type { PredictionCase, ParameterSamples } from './utils/distributions'
import { toPng } from 'html-to-image'
import { PARAMETER_DETAILS, PARAMETER_KEYS } from './constants'
import type { ParameterKey } from './constants'

type FormTab = 'classic' | 'gaussian' | 'file'

const FORM_TABS: Array<{ value: FormTab; label: string; helper: string }> = [
  {
    value: 'gaussian',
    label: 'Gaussian Sampling',
    helper: 'Provide value/std pairs to propagate observational uncertainty (noise-aware mode).',
  },
  {
    value: 'classic',
    label: 'Direct Input',
    helper: 'Send scalar or batched JSON payloads via the single/multi prediction endpoints.',
  },
  {
    value: 'file',
    label: 'File Upload',
    helper: 'Upload CSV/Numpy/Excel/Parquet files to trigger file_prediction in bulk.',
  },
]

const sanitizeLabel = (value: string) => value.replace(/\s*\(.*?\)\s*$/, '')

const formatOutputDisplay = (key: string) => {
  const detail = PARAMETER_DETAILS.find((item) => item.id === key)
  const base = sanitizeLabel(key)
  if (!detail?.symbol?.length) {
    return detail?.unit ? `${base} (${detail.unit})` : base
  }
  const display = detail.symbol
    .map((segment) => segment.text)
    .join('')
  return detail.unit ? `${display} (${detail.unit})` : display
}


function App() {
  const [activeForm, setActiveForm] = useState<FormTab>('gaussian')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<PredictionResponse | null>(null)
  const [cases, setCases] = useState<PredictionCase[]>([])
  const [activeCaseIndex, setActiveCaseIndex] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [copied, setCopied] = useState(false)
  const chartsRef = useRef<HTMLDivElement>(null)
  const resultsSectionRef = useRef<HTMLDivElement>(null)
  const [chartsAnimateKey, setChartsAnimateKey] = useState(0)
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null)
  const [toast, setToast] = useState<{ key: number; message: string; severity: AlertColor } | null>(null)
  const [expandedParameter, setExpandedParameter] = useState<ParameterKey | null>(null)
  const exportMenuOpen = Boolean(exportAnchorEl)

  const triggerToast = useCallback((message: string, severity: AlertColor = 'success') => {
    setToast({ key: Date.now(), message, severity })
  }, [])

  const runRequest = useCallback(
    async (fn: () => Promise<PredictionResponse>) => {
      const start = performance.now()
      try {
        setIsLoading(true)
        setError(null)
        setCopied(false)
        const response = await fn()
        setRawResponse(response)
        const normalized = normalizePredictionCases(response)
        setCases(normalized)
        setActiveCaseIndex(0)
        setLastUpdated(new Date())
        setChartsAnimateKey((key) => key + 1)
        const duration = ((performance.now() - start) / 1000).toFixed(1)
        triggerToast(
          normalized.length ? `Inference complete · ${duration}s` : 'Inference complete but API returned no samples',
          normalized.length ? 'success' : 'warning',
        )
      } catch (requestError) {
        const message = extractErrorMessage(requestError)
        setError(message)
        triggerToast(message, 'error')
      } finally {
        setIsLoading(false)
      }
    },
    [triggerToast],
  )

  const handleClassicSubmit = async (payload: { endpoint: 'single_prediction' | 'multi_prediction'; request: Record<string, unknown> }) => {
    await runRequest(() => postJson(payload.endpoint, payload.request))
  }

  const handleGaussianSubmit = async (payload: Record<string, unknown>) => {
    await runRequest(() => postJson('prediction_with_gaussian', payload))
  }

  const handleFileSubmit = async (form: FormData) => {
    await runRequest(() => postFile(form))
  }

  const handleToastClose = () => setToast(null)

  const handleExportPng = async () => {
    if (!chartsRef.current || !cases.length) return
    const dataUrl = await toPng(chartsRef.current, {
      cacheBust: true,
      backgroundColor: '#050915',
    })
    const link = document.createElement('a')
    link.download = `${cases[activeCaseIndex].id.replace(/\\s+/g, '_').toLowerCase()}_cvae.png`
    link.href = dataUrl
    link.click()
    triggerToast('PNG export ready')
  }

  const downloadBlob = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCsv = () => {
    const active = cases[activeCaseIndex]
    if (!active) {
      triggerToast('No case available for export', 'warning')
      return
    }
    const parameters = PARAMETER_KEYS
    const maxLength = Math.max(...parameters.map((key) => activeSamples[key as ParameterKey]?.length || 0))
    if (!maxLength) {
      triggerToast('The current case has no samples to export', 'warning')
      return
    }
    const rows = [
      ['sample', ...parameters].join(','),
      ...Array.from({ length: maxLength }, (_, index) =>
        [
          String(index + 1),
          ...parameters.map((key) => {
            const value = activeSamples[key as ParameterKey]?.[index]
            return value ?? ''
          }),
        ].join(','),
      ),
    ]
    const filename = `${active.id.replace(/\\s+/g, '_').toLowerCase()}_posterior.csv`
    downloadBlob(rows.join('\n'), filename, 'text/csv;charset=utf-8;')
    triggerToast('CSV export ready')
  }

  const handleExportJson = () => {
    if (!rawResponse) {
      triggerToast('No raw response to export', 'warning')
      return
    }
    const active = cases[activeCaseIndex]
    const filename = `${(active?.id || 'cvae').replace(/\\s+/g, '_').toLowerCase()}_response.json`
    downloadBlob(JSON.stringify(rawResponse, null, 2), filename, 'application/json')
    triggerToast('JSON export ready')
  }

  const handleExportMenuOpen = (event: MouseEvent<HTMLButtonElement>) => {
    setExportAnchorEl(event.currentTarget)
  }

  const handleExportMenuClose = () => setExportAnchorEl(null)

  const handleCopyResponse = async () => {
    if (!rawResponse) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(rawResponse, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      triggerToast('JSON copied to clipboard')
    } catch (clipboardError) {
      console.error(clipboardError)
      triggerToast('Unable to copy JSON in this environment', 'error')
    }
  }

  const activeCase = cases[activeCaseIndex]
  const activeSamples: ParameterSamples = activeCase?.parameters || {}
  const formattedResponse = useMemo(() => (rawResponse ? JSON.stringify(rawResponse, null, 2) : ''), [rawResponse])
  const currentTabHelper = FORM_TABS.find((tab) => tab.value === activeForm)?.helper ?? ''
  const outputDisplayTokens = useMemo(() => PARAMETER_KEYS.map((key) => formatOutputDisplay(key)), [])
  const expandedSamples = expandedParameter ? activeSamples[expandedParameter] || [] : []

  useEffect(() => {
    if (!isLoading && cases.length && lastUpdated && resultsSectionRef.current) {
      resultsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [cases.length, isLoading, lastUpdated])

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', py: { xs: 4, md: 8 } }}>
      <div className="aurora-ring" />
      <div className="aurora-ring aurora-ring--2" style={{ top: '15%', right: '10%' }} />
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={4}>
          <Stack spacing={3}>
            <Box textAlign="left">
              <Typography variant="h4" gutterBottom>
                DeepEXO-cVAE: Noise-Aware Inference of Exoplanet Interiors
              </Typography>
              <Typography color="text.secondary" maxWidth="720px">
                Real-time probabilistic inference of rocky exoplanet interiors with a noise-aware conditional VAE.
              </Typography>
              <Typography variant="body2" color="text.secondary" maxWidth="720px" sx={{ mt: 1 }}>
                Mass/radius fields use Earth units (training window 0.1–10 M⊕) while Fe/Mg and Si/Mg are bulk molar ratios. In Gaussian mode pass relative standard deviations within [0, 1] to describe observational noise.
              </Typography>
              <Typography variant="body2" color="text.secondary" maxWidth="720px" sx={{ mt: 1 }}>
                Outputs: {outputDisplayTokens.join(', ')}
              </Typography>
              {lastUpdated && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Last run · {lastUpdated.toLocaleTimeString()} — API endpoint: {DISPLAY_API_URL}
                </Typography>
              )}
            </Box>
          </Stack>

          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={3}>
              <Tabs
                value={activeForm}
                onChange={(_, value) => setActiveForm(value as FormTab)}
                variant="scrollable"
                scrollButtons="auto"
                TabIndicatorProps={{
                  style: {
                    height: 3,
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #8adfff, #c792ff)',
                  },
                }}
              >
                {FORM_TABS.map((tab) => (
                  <Tab key={tab.value} value={tab.value} label={tab.label} sx={{ fontWeight: 600 }} />
                ))}
              </Tabs>
              <Box
                sx={{
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  p: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {currentTabHelper}
                </Typography>
              </Box>
              {error && <Alert severity="error">{error}</Alert>}
              {activeForm === 'classic' && <ClassicPayloadForm isLoading={isLoading} onSubmit={handleClassicSubmit} />}
              {activeForm === 'gaussian' && <GaussianPayloadForm isLoading={isLoading} onSubmit={handleGaussianSubmit} />}
              {activeForm === 'file' && <FilePayloadForm isLoading={isLoading} onSubmit={handleFileSubmit} />}
            </Stack>
          </Paper>

          <Menu anchorEl={exportAnchorEl} open={exportMenuOpen} onClose={handleExportMenuClose}>
            <MenuItem
              disabled={!cases.length}
              onClick={() => {
                handleExportMenuClose()
                void handleExportPng()
              }}
            >
              PNG (dashboard)
            </MenuItem>
            <MenuItem
              disabled={!cases.length}
              onClick={() => {
                handleExportMenuClose()
                handleExportCsv()
              }}
            >
              CSV (posterior samples)
            </MenuItem>
            <MenuItem
              disabled={!rawResponse}
              onClick={() => {
                handleExportMenuClose()
                handleExportJson()
              }}
            >
              JSON (raw response)
            </MenuItem>
          </Menu>

          <Paper sx={{ p: { xs: 2, md: 3 } }} ref={resultsSectionRef}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
              mb={2}
              spacing={2}
            >
              <Box>
                <Typography variant="h5">Posterior distributions</Typography>
                <Typography variant="body2" color="text.secondary">
                  Each panel shows the posterior of one interior parameter inferred by the cVAE model.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={handleExportMenuOpen}
                disabled={!cases.length || isLoading}
              >
                Export
              </Button>
            </Stack>

            {isLoading && (
              <Stack alignItems="center" spacing={1} py={5}>
                <CircularProgress color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Sampling latent space…
                </Typography>
              </Stack>
            )}

            {!isLoading && cases.length === 0 && (
              <Stack alignItems="center" spacing={1} py={5}>
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  No runs yet. Submit a payload to generate the eight interior parameter posteriors.
                </Typography>
              </Stack>
            )}

            {!isLoading && cases.length > 0 && (
              <>
                {cases.length > 1 && <CaseTabs cases={cases} activeIndex={activeCaseIndex} onChange={setActiveCaseIndex} />}
                <Box ref={chartsRef} key={chartsAnimateKey} className="charts-panel" data-animate="true">
                  <ParameterGrid samples={activeSamples} onExpand={setExpandedParameter} />
                </Box>
              </>
            )}
          </Paper>

          {rawResponse && (
            <Paper sx={{ p: 0 }}>
              <Accordion defaultExpanded={false} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, md: 3 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%" spacing={2}>
                    <Typography variant="h6">Raw API Output</Typography>
                    <Tooltip title={copied ? 'Copied' : 'Copy JSON'}>
                      <span>
                        <IconButton color={copied ? 'success' : 'default'} onClick={handleCopyResponse}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 } }}>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      maxHeight: 320,
                      overflow: 'auto',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderRadius: 2,
                      p: 2,
                      fontSize: 13,
                    }}
                  >
                    {formattedResponse}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Paper>
          )}

          <Typography variant="caption" color="text.secondary" textAlign="center">
            DeepEXO-cVAE v0.0.2 · © 2025 Vector Zhao · API: api.deepexo.eu.org
          </Typography>
        </Stack>
      </Container>

      <Dialog open={Boolean(expandedParameter)} onClose={() => setExpandedParameter(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          {expandedParameter || 'Parameter'}
          <IconButton
            onClick={() => setExpandedParameter(null)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {expandedParameter ? (
            <ParameterInsight parameter={expandedParameter} samples={expandedSamples} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No parameter selected
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={3500}
        onClose={handleToastClose}
      >
        <Alert
          severity={toast?.severity || 'info'}
          sx={{ width: '100%' }}
          variant="filled"
          onClose={handleToastClose}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default App
