import { useMemo, useRef, useState, useCallback } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import './App.css'
import ClassicPayloadForm from './components/forms/ClassicPayloadForm'
import GaussianPayloadForm from './components/forms/GaussianPayloadForm'
import FilePayloadForm from './components/forms/FilePayloadForm'
import CaseTabs from './components/dashboard/CaseTabs'
import ParameterGrid from './components/dashboard/ParameterGrid'
import { DISPLAY_API_URL } from './config'
import { postJson, postFile, extractErrorMessage } from './api/cvae'
import type { PredictionResponse } from './api/cvae'
import { normalizePredictionCases } from './utils/distributions'
import type { PredictionCase, ParameterSamples } from './utils/distributions'
import { toPng } from 'html-to-image'

type FormTab = 'classic' | 'gaussian' | 'file'

const FORM_TABS: Array<{ value: FormTab; label: string; helper: string }> = [
  {
    value: 'classic',
    label: 'Scalar / Batch JSON',
    helper: 'Send arrays of Mass, Radius, Fe/Mg, Si/Mg via single/multi prediction endpoints.',
  },
  {
    value: 'gaussian',
    label: 'Gaussian Sampling',
    helper: 'Propagate observational uncertainties by providing value/std for each input parameter.',
  },
  {
    value: 'file',
    label: 'File Upload',
    helper: 'Upload CSV/Numpy/Excel/Parquet files with Mass, Radius, Fe/Mg, Si/Mg columns.',
  },
]

function App() {
  const [activeForm, setActiveForm] = useState<FormTab>('classic')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<PredictionResponse | null>(null)
  const [cases, setCases] = useState<PredictionCase[]>([])
  const [activeCaseIndex, setActiveCaseIndex] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [copied, setCopied] = useState(false)
  const chartsRef = useRef<HTMLDivElement>(null)

  const runRequest = useCallback(async (fn: () => Promise<PredictionResponse>) => {
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
    } catch (requestError) {
      const message = extractErrorMessage(requestError)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleClassicSubmit = async (payload: { endpoint: 'single_prediction' | 'multi_prediction'; request: Record<string, unknown> }) => {
    await runRequest(() => postJson(payload.endpoint, payload.request))
  }

  const handleGaussianSubmit = async (payload: Record<string, unknown>) => {
    await runRequest(() => postJson('prediction_with_gaussian', payload))
  }

  const handleFileSubmit = async (form: FormData) => {
    await runRequest(() => postFile(form))
  }

  const handleExportCharts = async () => {
    if (!chartsRef.current || !cases.length) return
    const dataUrl = await toPng(chartsRef.current, {
      cacheBust: true,
      backgroundColor: '#050915',
    })
    const link = document.createElement('a')
    link.download = `${cases[activeCaseIndex].id.replace(/\\s+/g, '_').toLowerCase()}_cvae.png`
    link.href = dataUrl
    link.click()
  }

  const handleCopyResponse = async () => {
    if (!rawResponse) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(rawResponse, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (clipboardError) {
      setError('Unable to copy to clipboard inside this browser context.')
    }
  }

  const activeCase = cases[activeCaseIndex]
  const activeSamples: ParameterSamples = activeCase?.parameters || {}
  const formattedResponse = useMemo(() => (rawResponse ? JSON.stringify(rawResponse, null, 2) : ''), [rawResponse])

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', py: { xs: 4, md: 8 } }}>
      <div className="aurora-ring" />
      <div className="aurora-ring aurora-ring--2" style={{ top: '15%', right: '10%' }} />
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={4}>
          <Stack spacing={1} alignItems="center" textAlign="center">
            <Typography variant="h3" gutterBottom>
              cVAE Interior Explorer
            </Typography>
            <Typography color="text.secondary" maxWidth="720px">
              Visualise conditional VAE predictions for rocky exoplanet interiors. Craft scalar, batched, Gaussian, or file-based payloads and
              compare the eight structural parameters returned by the DeepExo cVAE API.
            </Typography>
            <Typography variant="body2" color="text.secondary" maxWidth="720px">
              Mass and radius fields use Earth units (mass training window 0.1–10 M⊕). Fe/Mg and Si/Mg inputs are bulk molar ratios, and Gaussian standard deviations should be supplied as relative values between 0 and 1.
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
              <Chip color="primary" label={`API: ${DISPLAY_API_URL}`} size="small" />
              {lastUpdated && <Chip label={`Last run: ${lastUpdated.toLocaleTimeString()}`} size="small" />}
              <Chip label="Model outputs: WRF · MRF · CRF · WMF · CMF · P_CMB · T_CMB · K2" size="small" variant="outlined" />
            </Stack>
          </Stack>

          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Tabs value={activeForm} onChange={(_, value) => setActiveForm(value as FormTab)} variant="scrollable" scrollButtons="auto">
                {FORM_TABS.map((tab) => (
                  <Tab key={tab.value} value={tab.value} label={tab.label} />
                ))}
              </Tabs>
              <Typography variant="body2" color="text.secondary">
                {FORM_TABS.find((tab) => tab.value === activeForm)?.helper}
              </Typography>
              {error && <Alert severity="error">{error}</Alert>}
              {activeForm === 'classic' && <ClassicPayloadForm isLoading={isLoading} onSubmit={handleClassicSubmit} />}
              {activeForm === 'gaussian' && <GaussianPayloadForm isLoading={isLoading} onSubmit={handleGaussianSubmit} />}
              {activeForm === 'file' && <FilePayloadForm isLoading={isLoading} onSubmit={handleFileSubmit} />}
            </Stack>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" mb={2} spacing={2}>
              <Box>
                <Typography variant="h5">Posterior distributions</Typography>
                <Typography variant="body2" color="text.secondary">
                  Interact with each returned case, compare parameter histograms, and export the sky-map inspired dashboard.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExportCharts}
                disabled={!cases.length || isLoading}
              >
                Export PNG
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
                <Typography variant="body1" color="text.secondary">
                  No predictions yet. Submit a payload to see the eight-parameter distribution map.
                </Typography>
              </Stack>
            )}

            {!isLoading && cases.length > 0 && (
              <>
                {cases.length > 1 && <CaseTabs cases={cases} activeIndex={activeCaseIndex} onChange={setActiveCaseIndex} />}
                <Box ref={chartsRef}>
                  <ParameterGrid samples={activeSamples} />
                </Box>
              </>
            )}
          </Paper>

          {rawResponse && (
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Raw API response</Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy JSON'}>
                  <span>
                    <IconButton color={copied ? 'success' : 'default'} onClick={handleCopyResponse}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
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
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  )
}

export default App
