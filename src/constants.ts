export const PARAMETER_DETAILS = [
  { id: 'WRF', label: 'Water Radial Fraction', color: '#7AE5FF', unit: '' },
  { id: 'MRF', label: 'Mantle Radial Fraction', color: '#A0F4DB', unit: '' },
  { id: 'CRF', label: 'Core Radial Fraction', color: '#F9D976', unit: '' },
  { id: 'WMF', label: 'Water Mass Fraction', color: '#8AC5FF', unit: '' },
  { id: 'CMF', label: 'Core Mass Fraction', color: '#FF9E9E', unit: '' },
  { id: 'P_CMB (TPa)', label: 'Core-Mantle Boundary Pressure (TPa)', color: '#FFBE7B', unit: 'TPa' },
  { id: 'T_CMB (10^3K)', label: 'Core-Mantle Boundary Temp (10^3K)', color: '#C799FF', unit: '10^3K' },
  { id: 'K2', label: 'Tidal Love Number (k2)', color: '#B9A3FF', unit: '' },
] as const;

export type ParameterKey = (typeof PARAMETER_DETAILS)[number]['id'];

export const PARAMETER_KEYS = PARAMETER_DETAILS.map((item) => item.id);

export const DEFAULT_SAMPLE_TIMES = 25;
