import { Box } from '@mui/material'
import { PARAMETER_KEYS } from '../../constants'
import type { ParameterKey } from '../../constants'
import type { ParameterSamples } from '../../utils/distributions'
import ParameterCard from './ParameterCard'

interface ParameterGridProps {
  samples: ParameterSamples
  onExpand?: (parameter: ParameterKey) => void
}

export default function ParameterGrid({ samples, onExpand }: ParameterGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'repeat(1, minmax(0, 1fr))',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
        },
      }}
    >
      {PARAMETER_KEYS.map((key) => (
        <ParameterCard
          key={key}
          parameter={key as ParameterKey}
          samples={samples[key as ParameterKey] || []}
          onExpand={onExpand}
        />
      ))}
    </Box>
  )
}
