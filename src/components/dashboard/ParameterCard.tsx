import { memo } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { PARAMETER_DETAILS } from '../../constants'
import type { ParameterKey } from '../../constants'
import { buildHistogram, computeStats } from '../../utils/distributions'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

interface ParameterCardProps {
  parameter: ParameterKey
  samples: number[]
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

function ParameterCard({ parameter, samples }: ParameterCardProps) {
  const meta = PARAMETER_DETAILS.find((item) => item.id === parameter)
  const stats = computeStats(samples)
  const histogram = buildHistogram(samples)

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            {meta?.label || parameter}
          </Typography>
          {samples.length ? (
            <>
              <Typography variant="h4" color="primary.main">
                {stats ? stats.mean.toFixed(3) : '--'}
                {meta?.unit ? (
                  <Box component="span" sx={{ ml: 0.5, fontSize: '0.4em', letterSpacing: '0.08em' }}>
                    {meta.unit}
                  </Box>
                ) : null}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                μ ± σ: {stats?.mean.toFixed(3)} ± {stats?.std.toFixed(3)} | min/max: {stats?.min.toFixed(3)} /{' '}
                {stats?.max.toFixed(3)}
              </Typography>
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
                        tension: 0.35,
                        fill: true,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No samples returned by API.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default memo(ParameterCard)
