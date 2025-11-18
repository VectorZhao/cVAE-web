import { useFieldArray, useForm } from 'react-hook-form'
import { Box, Button, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
interface GaussianCase {
  massValue: number
  massStd: number
  radiusValue: number
  radiusStd: number
  feValue: number
  feStd: number
  siValue: number
  siStd: number
}

interface GaussianFormValues {
  sample_num?: number
  times?: number
  cases: GaussianCase[]
}

interface GaussianPayloadFormProps {
  isLoading: boolean
  onSubmit: (payload: Record<string, unknown>) => Promise<void> | void
}

const DEFAULT_CASE: GaussianCase = {
  massValue: 1,
  massStd: 0.02,
  radiusValue: 1,
  radiusStd: 0.02,
  feValue: 0.9,
  feStd: 0.02,
  siValue: 0.8,
  siStd: 0.02,
}

type GaussianField = {
  key: keyof GaussianCase
  label: string
  min: number
  max?: number
  helper?: string
  tooltip?: string
  rangeLabel?: string
}

const fieldDefinitions: GaussianField[] = [
  {
    key: 'massValue',
    label: 'Mass value (Earth masses)',
    min: 0.1,
    max: 10,
    helper: 'Training range: 0.1–10 M⊕',
    rangeLabel: '[0.1–10]'
  },
  {
    key: 'massStd',
    label: 'Mass std (relative)',
    min: 0,
    max: 1,
    tooltip: 'Relative standard deviation; 0.02 equals ±2% uncertainty',
    rangeLabel: '[0–1]'
  },
  {
    key: 'radiusValue',
    label: 'Radius value (Earth radii)',
    min: 0,
  },
  {
    key: 'radiusStd',
    label: 'Radius std (relative)',
    min: 0,
    max: 1,
    tooltip: 'Provide a relative error between 0 and 1',
    rangeLabel: '[0–1]'
  },
  {
    key: 'feValue',
    label: 'Fe/Mg value (bulk molar ratio)',
    min: 0,
  },
  {
    key: 'feStd',
    label: 'Fe/Mg std (relative)',
    min: 0,
    max: 1,
    tooltip: 'Provide relative error (0.05 ≈ ±5% uncertainty)',
    rangeLabel: '[0–1]'
  },
  {
    key: 'siValue',
    label: 'Si/Mg value (bulk molar ratio)',
    min: 0,
  },
  {
    key: 'siStd',
    label: 'Si/Mg std (relative)',
    min: 0,
    max: 1,
    tooltip: 'Provide relative error (0.05 ≈ ±5%)',
    rangeLabel: '[0–1]'
  },
]

export default function GaussianPayloadForm({ isLoading, onSubmit }: GaussianPayloadFormProps) {
  const { control, register, handleSubmit, watch } = useForm<GaussianFormValues>({
    defaultValues: {
      sample_num: 500,
      times: 20,
      cases: [DEFAULT_CASE],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'cases' })

  const submitHandler = (values: GaussianFormValues) => {
    const payload: Record<string, unknown> = {
      Mass: {
        value: values.cases.map((c) => Number(c.massValue)),
        std: values.cases.map((c) => Number(c.massStd)),
      },
      Radius: {
        value: values.cases.map((c) => Number(c.radiusValue)),
        std: values.cases.map((c) => Number(c.radiusStd)),
      },
      'Fe/Mg': {
        value: values.cases.map((c) => Number(c.feValue)),
        std: values.cases.map((c) => Number(c.feStd)),
      },
      'Si/Mg': {
        value: values.cases.map((c) => Number(c.siValue)),
        std: values.cases.map((c) => Number(c.siStd)),
      },
    }

    if (values.sample_num && Number.isFinite(values.sample_num)) {
      payload.sample_num = Number(values.sample_num)
    }
    if (values.times && Number.isFinite(values.times)) {
      payload.Times = Number(values.times)
    }

    onSubmit(payload)
  }

  const watchedCases = watch('cases')

  const handleAddCase = () => {
    const last = watchedCases?.[watchedCases.length - 1]
    append(last ? { ...last } : { ...DEFAULT_CASE })
  }

  return (
    <Box component="form" onSubmit={handleSubmit(submitHandler)}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: 'repeat(1, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          <TextField
            label="Samples per anchor"
            type="number"
            inputProps={{ min: 10, max: 5000 }}
            {...register('sample_num', { valueAsNumber: true })}
            helperText="Number of Gaussian samples per anchor"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Approximate observational noise; 300–1000 recommended">
                    <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Model draws per sample"
            type="number"
            inputProps={{ min: 1, max: 500 }}
            {...register('times', { valueAsNumber: true })}
            helperText="Posterior draws per Gaussian sample"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Larger values reduce noise but increase runtime">
                    <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Enter mass/radius in Earth units and Fe/Mg, Si/Mg as bulk molar ratios. Standard deviation fields expect relative errors between 0 and 1.
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">Gaussian anchor points ({watch('cases')?.length || 0})</Typography>
          <Button onClick={handleAddCase} startIcon={<AddCircleOutlineIcon />} disabled={isLoading}>
            Add anchor
          </Button>
        </Stack>

        {fields.map((field, index) => (
          <Box
            key={field.id}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(8, 12, 28, 0.65)',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2">Point {index + 1}</Typography>
              <IconButton
                size="small"
                color="error"
                onClick={() => remove(index)}
                disabled={fields.length === 1 || isLoading}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: 'repeat(1, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                {fieldDefinitions.map(({ key, label, min, max, helper, tooltip, rangeLabel }) => (
                  <TextField
                    key={key}
                    fullWidth
                    label={rangeLabel ? `${label} ${rangeLabel}` : label}
                    type="number"
                    inputProps={{ min, max, step: 'any' }}
                    {...register(`cases.${index}.${key as keyof GaussianCase}`, {
                      valueAsNumber: true,
                    })}
                    helperText={helper}
                    InputProps={
                      tooltip
                        ? {
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title={tooltip}>
                                  <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                </Tooltip>
                              </InputAdornment>
                            ),
                          }
                        : undefined
                    }
                  />
                ))}
              </Box>
            </Box>
        ))}

        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {isLoading ? 'Sampling…' : 'Run posterior inference'}
        </Button>
      </Stack>
    </Box>
  )
}
