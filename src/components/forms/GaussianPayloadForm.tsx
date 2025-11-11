import { useFieldArray, useForm } from 'react-hook-form'
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
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
}

const fieldDefinitions: GaussianField[] = [
  { key: 'massValue', label: 'Mass value (Earth masses)', min: 0.1, max: 10, helper: 'Training range: 0.1 – 10' },
  { key: 'massStd', label: 'Mass std (relative, 0–1)', min: 0, max: 1 },
  { key: 'radiusValue', label: 'Radius value (Earth radii)', min: 0 },
  { key: 'radiusStd', label: 'Radius std (relative, 0–1)', min: 0, max: 1 },
  { key: 'feValue', label: 'Fe/Mg value (bulk molar ratio)', min: 0 },
  { key: 'feStd', label: 'Fe/Mg std (relative, 0–1)', min: 0, max: 1 },
  { key: 'siValue', label: 'Si/Mg value (bulk molar ratio)', min: 0 },
  { key: 'siStd', label: 'Si/Mg std (relative, 0–1)', min: 0, max: 1 },
]

export default function GaussianPayloadForm({ isLoading, onSubmit }: GaussianPayloadFormProps) {
  const { control, register, handleSubmit, watch } = useForm<GaussianFormValues>({
    defaultValues: {
      sample_num: 1000,
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

  const handleAddCase = () => append({ ...DEFAULT_CASE })

  return (
    <Box component="form" onSubmit={handleSubmit(submitHandler)}>
      <Stack spacing={2}>
        <TextField
          label="Gaussian samples per point"
          type="number"
          inputProps={{ min: 1, max: 2000 }}
          {...register('sample_num', { valueAsNumber: true })}
        />

        <TextField
          label="Times (posterior draws per Gaussian point)"
          type="number"
          inputProps={{ min: 1, max: 500 }}
          {...register('times', { valueAsNumber: true })}
        />

        <Typography variant="body2" color="text.secondary">
          Mass and radius are in Earth units (mass training range 0.1 – 10). Provide standard deviations as relative fractions between 0 and 1; Fe/Mg and Si/Mg inputs are bulk molar ratios.
        </Typography>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">Gaussian anchor points ({watch('cases')?.length || 0})</Typography>
          <Button onClick={handleAddCase} startIcon={<AddCircleOutlineIcon />} disabled={isLoading}>
            Add anchor
          </Button>
        </Stack>

        {fields.map((field, index) => (
          <Box key={field.id} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
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
              {fieldDefinitions.map(({ key, label, min, max, helper }) => (
                <TextField
                  key={key}
                  fullWidth
                  label={label}
                  type="number"
                  inputProps={{ min, max, step: 'any' }}
                  {...register(`cases.${index}.${key as keyof GaussianCase}`, {
                    valueAsNumber: true,
                  })}
                  helperText={helper}
                />
              ))}
            </Box>
          </Box>
        ))}

        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {isLoading ? 'Sampling…' : 'Send Gaussian payload'}
        </Button>
      </Stack>
    </Box>
  )
}
