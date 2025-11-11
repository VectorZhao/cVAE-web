import type { SyntheticEvent } from 'react'
import { Box, Tab, Tabs } from '@mui/material'
import type { PredictionCase } from '../../utils/distributions'

interface CaseTabsProps {
  cases: PredictionCase[]
  activeIndex: number
  onChange: (index: number) => void
}

export default function CaseTabs({ cases, activeIndex, onChange }: CaseTabsProps) {
  const handleChange = (_: SyntheticEvent, newValue: number) => onChange(newValue)

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs value={activeIndex} onChange={handleChange} variant="scrollable" scrollButtons="auto">
        {cases.map((item, index) => (
          <Tab key={item.id} label={`${item.id} (${index + 1})`} />
        ))}
      </Tabs>
    </Box>
  )
}
