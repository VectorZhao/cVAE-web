export type SymbolSegment = {
  text: string
  italic?: boolean
  subscript?: boolean
}

export type ParameterDetail = {
  id: string
  label: string
  color: string
  unit?: string
  symbol?: SymbolSegment[]
}

const PARAMETER_DETAIL_DATA = [
  { id: 'WRF', label: 'Water Radial Fraction', color: '#7AE5FF' },
  { id: 'MRF', label: 'Mantle Radial Fraction', color: '#A0F4DB' },
  { id: 'CRF', label: 'Core Radial Fraction', color: '#F9D976' },
  { id: 'WMF', label: 'Water Mass Fraction', color: '#8AC5FF' },
  { id: 'CMF', label: 'Core Mass Fraction', color: '#FF9E9E' },
  {
    id: 'P_CMB (TPa)',
    label: 'Core-Mantle Boundary Pressure',
    color: '#FFBE7B',
    unit: 'TPa',
    symbol: [
      { text: 'P', italic: true },
      { text: 'CMB', subscript: true },
    ],
  },
  {
    id: 'T_CMB (10^3K)',
    label: 'Core-Mantle Boundary Temperature',
    color: '#C799FF',
    unit: '10^3 K',
    symbol: [
      { text: 'T', italic: true },
      { text: 'CMB', subscript: true },
    ],
  },
  {
    id: 'K2',
    label: 'Tidal Love Number',
    color: '#B9A3FF',
    symbol: [
      { text: 'k', italic: true },
      { text: '2', subscript: true },
    ],
  },
  // cast ensures literal precision while keeping ParameterDetail shape
] as const satisfies readonly ParameterDetail[]

export const PARAMETER_DETAILS: readonly ParameterDetail[] = PARAMETER_DETAIL_DATA

export type ParameterKey = (typeof PARAMETER_DETAIL_DATA)[number]['id']

export const PARAMETER_KEYS = PARAMETER_DETAILS.map((item) => item.id)

export const DEFAULT_SAMPLE_TIMES = 25
