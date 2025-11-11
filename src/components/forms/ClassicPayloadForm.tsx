import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Box, Button, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { DEFAULT_SAMPLE_TIMES } from '../../constants'

type ClassicEndpoint = 'single_prediction' | 'multi_prediction'

interface ClassicPayloadFormValues {
  endpoint: ClassicEndpoint
  times?: number
  cases: Array<{
    mass: number
    radius: number
    feMg: number
    siMg: number
  }>
}

interface ClassicPayloadFormProps {
  isLoading: boolean
  onSubmit: (payload: { endpoint: ClassicEndpoint; request: Record<string, unknown> }) => Promise<void> | void
}

const DEFAULT_CASE = {
  mass: 1,
  radius: 1,
  feMg: 0.9,
  siMg: 0.8,
}

type ClassicField = {
  key: keyof typeof DEFAULT_CASE
  label: string
  min: number
  max?: number
}

const fieldLabels: ClassicField[] = [
  { key: 'mass', label: 'Mass (Earth masses)', min: 0.1, max: 10 },
  { key: 'radius', label: 'Radius (Earth radii)', min: 0 },
  { key: 'feMg', label: 'Fe/Mg (bulk molar ratio)', min: 0 },
  { key: 'siMg', label: 'Si/Mg (bulk molar ratio)', min: 0 },
] 

export default function ClassicPayloadForm({ isLoading, onSubmit }: ClassicPayloadFormProps) {
  const { control, register, handleSubmit, watch } = useForm<ClassicPayloadFormValues>({
    defaultValues: {
      endpoint: 'single_prediction',
      times: DEFAULT_SAMPLE_TIMES,
      cases: [DEFAULT_CASE],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'cases' })

  const submitHandler = (values: ClassicPayloadFormValues) => {
    const request: Record<string, unknown> = {
      Mass: values.cases.map((c) => Number(c.mass)),
      Radius: values.cases.map((c) => Number(c.radius)),
      'Fe/Mg': values.cases.map((c) => Number(c.feMg)),
      'Si/Mg': values.cases.map((c) => Number(c.siMg)),
    }

    if (values.times && Number.isFinite(values.times)) {
      request.Times = Number(values.times)
    }

    onSubmit({ endpoint: values.endpoint, request })
  }

  const handleAddCase = () => append({ ...DEFAULT_CASE })

  return (
    <Box component="form" onSubmit={handleSubmit(submitHandler)}>
      <Stack spacing={2}>
        <Controller
          name="endpoint"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel id="endpoint-label">Endpoint</InputLabel>
              <Select
                {...field}
                labelId="endpoint-label"
                label="Endpoint"
                sx={{ textTransform: 'capitalize' }}
              >
                <MenuItem value="single_prediction">Single Prediction</MenuItem>
                <MenuItem value="multi_prediction">Multi Prediction</MenuItem>
              </Select>
            </FormControl>
          )}
        />

        <TextField
          label="Times (samples per case)"
          type="number"
          inputProps={{ min: 1, max: 500 }}
          {...register('times', { valueAsNumber: true })}
        />

        <Typography variant="body2" color="text.secondary">
          Mass and radius are expressed in Earth units (mass training range 0.1 – 10). Fe/Mg and Si/Mg correspond to bulk molar ratios.
        </Typography>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">Planet Cases ({watch('cases')?.length || 0})</Typography>
          <Button onClick={handleAddCase} startIcon={<AddCircleOutlineIcon />} disabled={isLoading}>
            Add case
          </Button>
        </Stack>

        {fields.map((field, index) => (
          <Box key={field.id} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2">Case {index + 1}</Typography>
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
              {fieldLabels.map(({ key, label, min, max }) => (
                <TextField
                  key={key}
                  label={label}
                  type="number"
                  fullWidth
                  inputProps={{
                    min,
                    max,
                    step: 'any',
                  }}
                  {...register(`cases.${index}.${key as keyof typeof DEFAULT_CASE}`, {
                    valueAsNumber: true,
                  })}
                  helperText={key === 'mass' ? 'Training range: 0.1 – 10 Earth masses' : undefined}
                />
              ))}
            </Box>
          </Box>
        ))}

        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {isLoading ? 'Running inference…' : 'Send to API'}
        </Button>
      </Stack>
    </Box>
  )
}
