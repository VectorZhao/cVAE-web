import { useForm } from 'react-hook-form'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'

interface FileFormValues {
  file: FileList
  times?: number
}

interface FilePayloadFormProps {
  isLoading: boolean
  onSubmit: (form: FormData) => Promise<void> | void
}

export default function FilePayloadForm({ isLoading, onSubmit }: FilePayloadFormProps) {
  const { register, handleSubmit, reset, watch } = useForm<FileFormValues>()
  const fileList = watch('file')

  const submitHandler = (values: FileFormValues) => {
    if (!values.file?.length) {
      return
    }
    const form = new FormData()
    form.append('file', values.file[0])
    if (values.times && Number.isFinite(values.times)) {
      form.append('Times', String(values.times))
    }
    onSubmit(form)
    reset()
  }

  return (
    <Box component="form" onSubmit={handleSubmit(submitHandler)}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Upload numpy/csv/xlsx/parquet files with columns ordered as Mass, Radius, Fe/Mg, Si/Mg.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" component="label" disabled={isLoading}>
            Select data file
            <input type="file" hidden accept=".csv,.npy,.xlsx,.xls,.parquet" {...register('file')} />
          </Button>
          {fileList?.[0] && (
            <Typography variant="body2" color="text.secondary">
              {fileList[0].name}
            </Typography>
          )}
        </Stack>
        <TextField
          label="Times (optional)"
          type="number"
          inputProps={{ min: 1, max: 500 }}
          {...register('times', { valueAsNumber: true })}
        />
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {isLoading ? 'Uploading…' : 'Send file payload'}
        </Button>
      </Stack>
    </Box>
  )
}
