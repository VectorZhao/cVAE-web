import axios, { AxiosError } from 'axios'
import { API_BASE_URL } from '../config'

export type ApiEndpoint =
  | 'single_prediction'
  | 'multi_prediction'
  | 'prediction_with_gaussian'
  | 'file_prediction'

const client = axios.create({
  baseURL: API_BASE_URL || 'http://127.0.0.1:8000/api',
  timeout: 20000,
})

export type PredictionResponse = Record<string, unknown>

export async function postJson(endpoint: ApiEndpoint, payload: Record<string, unknown>) {
  const response = await client.post<PredictionResponse>(`/${endpoint}`, payload)
  return response.data
}

export async function postFile(form: FormData) {
  const response = await client.post<PredictionResponse>('/file_prediction', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export function extractErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string }>
    return (
      axiosError.response?.data?.detail ||
      axiosError.response?.statusText ||
      axiosError.message ||
      'Unexpected API error'
    )
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}
