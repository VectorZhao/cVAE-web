import { memo, type ReactNode } from 'react'
import { Box, Card, CardContent, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { PARAMETER_DETAILS } from '../../constants'
import type { ParameterKey, ParameterDetail, SymbolSegment } from '../../constants'
import { buildHistogram, computeStats } from '../../utils/distributions'
import ZoomInIcon from '@mui/icons-material/ZoomIn'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ChartTooltip, Legend)

const sanitizeParameterId = (value: string) => value.replace(/\s*\(.*?\)\s*$/, '')

const renderSymbolSegment = (segment: SymbolSegment, index: number) => (
  <Box
    component="span"
    key={`${segment.text}-${index}`}
    sx={{
      fontStyle: segment.italic ? 'italic' : 'normal',
      verticalAlign: segment.subscript ? 'sub' : 'baseline',
      fontSize: segment.subscript ? '0.75em' : '1em',
      ml: index === 0 ? 0 : 0.2,
    }}
  >
    {segment.text}
  </Box>
)

const renderSymbol = (meta: ParameterDetail | undefined, fallback: string): ReactNode => {
  if (!meta?.symbol || !meta.symbol.length) {
    return sanitizeParameterId(fallback)
  }
  return meta.symbol.map((segment, index) => renderSymbolSegment(segment, index))
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
}

const toSuperscript = (value: string) => value.split('').map((char) => SUPERSCRIPT_MAP[char] || char).join('')

const formatUnitText = (unit: string) =>
  unit.replace(/(\d+)\^(\d+)/g, (_, base: string, exponent: string) => `${base}${toSuperscript(exponent)}`)

const renderUnit = (unit?: string, options?: { compact?: boolean; withMargin?: boolean }) => {
  if (!unit) return null
  const formatted = formatUnitText(unit)
  return (
    <Box
      component="span"
      sx={{
        ml:
          options?.withMargin === false ? 0 : options?.compact ? 0.5 : 0.5,
        fontSize: options?.compact ? '0.4em' : 'inherit',
      }}
    >
      {formatted}
    </Box>
  )
}

interface ParameterCardProps {
  parameter: ParameterKey
  samples: number[]
  onExpand?: (parameter: ParameterKey) => void
}

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'rgba(5, 9, 21, 0.85)',
      titleColor: '#ecf5ff',
      bodyColor: '#ecf5ff',
    },
  },
  elements: {
    point: { radius: 0 },
  },
  scales: {
    x: {
      ticks: { maxRotation: 0, color: 'rgba(255,255,255,0.8)' },
      grid: { color: 'rgba(255,255,255,0.06)' },
    },
    y: {
      beginAtZero: true,
      ticks: { color: 'rgba(255,255,255,0.8)' },
      grid: { color: 'rgba(255,255,255,0.06)' },
    },
  },
}

function ParameterCard({ parameter, samples, onExpand }: ParameterCardProps) {
  const meta = PARAMETER_DETAILS.find((item) => item.id === parameter)

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                {meta?.label || sanitizeParameterId(parameter)}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                {renderSymbol(meta, parameter)}
                {meta?.unit ? (
                  <Box component="span" sx={{ ml: 0.5 }}>
                    (
                    {renderUnit(meta.unit, { withMargin: false })}
                    )
                  </Box>
                ) : null}
              </Typography>
            </Box>
            {onExpand ? (
              <Tooltip title="View fullscreen">
                <span>
                  <IconButton size="small" onClick={() => onExpand(parameter)}>
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}
          </Stack>
          <ParameterInsight parameter={parameter} samples={samples} />
        </Stack>
      </CardContent>
    </Card>
  )
}

export function ParameterInsight({ parameter, samples }: Pick<ParameterCardProps, 'parameter' | 'samples'>) {
  const meta = PARAMETER_DETAILS.find((item) => item.id === parameter)
  const stats = computeStats(samples)
  const histogram = buildHistogram(samples)

  if (!samples.length || !stats) {
    return (
      <Typography variant="body2" color="text.secondary">
        No samples returned for this parameter.
      </Typography>
    )
  }

  const formatValue = (value: number | undefined) => (Number.isFinite(value) ? value?.toFixed(3) : '--')

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="h4" color="primary.main">
          {formatValue(stats.mean)}
          {renderUnit(meta?.unit, { compact: true })}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          μ = {formatValue(stats.mean)} ｜ σ = {formatValue(stats.std)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          16–84% : {formatValue(stats.p16)} – {formatValue(stats.p84)}
        </Typography>
      </Box>
      <Box sx={{ height: 240 }}>
        <Line
          data={{
            labels: histogram.labels,
            datasets: [
              {
                label: `${parameter} density`,
                data: histogram.counts,
                borderColor: meta?.color || '#8adfff',
                backgroundColor: 'rgba(138, 223, 255, 0.18)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
              },
            ],
          }}
          options={chartOptions}
        />
      </Box>
    </Stack>
  )
}

export default memo(ParameterCard)
