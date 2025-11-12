import { PARAMETER_DETAILS, PARAMETER_KEYS } from '../constants'
import type { ParameterKey } from '../constants'
import type { PredictionResponse } from '../api/cvae'

export type ParameterSamples = Partial<Record<ParameterKey, number[]>>

export interface PredictionCase {
  id: string
  parameters: ParameterSamples
}

export interface ParameterStats {
  count: number
  min: number
  max: number
  mean: number
  median: number
  std: number
  p16: number
  p84: number
}

export interface HistogramSeries {
  labels: string[]
  counts: number[]
}

const PARAMETER_SET = new Set(PARAMETER_KEYS)

const CASE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

function findPredictionDistribution(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return undefined
  if ('Prediction_distribution' in (payload as Record<string, unknown>)) {
    return (payload as Record<string, unknown>).Prediction_distribution
  }
  return Object.values(payload as Record<string, unknown>).reduce<unknown>((found, value) => {
    if (found !== undefined) {
      return found
    }
    return findPredictionDistribution(value)
  }, undefined)
}

export function normalizePredictionCases(response: PredictionResponse): PredictionCase[] {
  const distribution = findPredictionDistribution(response)
  if (!distribution) {
    return []
  }

  const entries = Array.isArray(distribution)
    ? distribution.map((value, index) => [String(index), value] as const)
    : Object.entries(distribution as Record<string, unknown>)

  return entries.map(([, value], idx) => ({
    id: `Case ${CASE_LABELS[idx] || idx + 1}`,
    parameters: extractParameterMap(value),
  }))
}

function extractParameterMap(entry: unknown): ParameterSamples {
  if (Array.isArray(entry)) {
    return entry.reduce<ParameterSamples>((acc, item) => mergeParameterMaps(acc, extractParameterMap(item)), {})
  }

  if (entry && typeof entry === 'object') {
    const obj = entry as Record<string, unknown>
    const hasParameterKeys = Object.keys(obj).some((key) => isParameterKey(key))

    if (hasParameterKeys) {
      return Object.entries(obj).reduce<ParameterSamples>((acc, [key, value]) => {
        if (!isParameterKey(key)) return acc
        const samples = collectNumericSamples(value)
        if (!samples.length) return acc
        acc[key] = (acc[key] || []).concat(samples)
        return acc
      }, {})
    }

    return Object.values(obj).reduce<ParameterSamples>((acc, value) => mergeParameterMaps(acc, extractParameterMap(value)), {})
  }

  return {}
}

function mergeParameterMaps(target: ParameterSamples, source: ParameterSamples) {
  const result: ParameterSamples = { ...target }
  Object.entries(source).forEach(([key, values]) => {
    if (!isParameterKey(key)) return
    const typedKey = key as ParameterKey
    result[typedKey] = (result[typedKey] || []).concat(values || [])
  })
  return result
}

function collectNumericSamples(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectNumericSamples(item))
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((item) => collectNumericSamples(item))
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? [numeric] : []
}

export function isParameterKey(value: string): value is ParameterKey {
  return PARAMETER_SET.has(value as ParameterKey)
}

export function computeStats(samples: number[]): ParameterStats | null {
  if (!samples.length) {
    return null
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const count = sorted.length
  const min = sorted[0]
  const max = sorted[count - 1]
  const mean = sorted.reduce((sum, value) => sum + value, 0) / count
  const median =
    count % 2 === 0 ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : sorted[Math.floor(count / 2)]
  const variance =
    sorted.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (count === 1 ? 1 : count - 1)
  const std = Math.sqrt(variance)
  const p16 = getPercentile(sorted, 0.16)
  const p84 = getPercentile(sorted, 0.84)
  return { count, min, max, mean, median, std, p16, p84 }
}

export function buildHistogram(samples: number[], bins = 20): HistogramSeries {
  if (!samples.length) {
    return { labels: [], counts: [] }
  }
  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const safeRange = max - min || Math.max(Math.abs(max), 1)
  const binSize = safeRange / bins || 1
  const counts = new Array(bins).fill(0)

  samples.forEach((value) => {
    const bucket = Math.min(Math.floor(((value - min) / safeRange) * bins), bins - 1)
    counts[bucket] += 1
  })

  const labels = counts.map((_, index) => {
    const center = min + (index + 0.5) * binSize
    return Number.isFinite(center) ? center.toFixed(3) : '0'
  })

  return { labels, counts }
}

export function getParameterLabel(param: ParameterKey) {
  return PARAMETER_DETAILS.find((item) => item.id === param)?.label || param
}

function getPercentile(values: number[], percentile: number) {
  if (!values.length) return NaN
  const index = (values.length - 1) * percentile
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) {
    return values[lower]
  }
  const weight = index - lower
  return values[lower] * (1 - weight) + values[upper] * weight
}
