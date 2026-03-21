/** FRED series allowed for /api/cpi — extend as needed */
export const CPI_SERIES_OPTIONS = [
  {
    id: 'CPIAUCSL',
    label: 'Headline CPI — All items',
    shortLabel: 'Headline',
    description: 'CPI for All Urban Consumers: U.S. city average, all items (seasonally adjusted index).',
  },
  {
    id: 'CPILFESL',
    label: 'Core CPI — Less food & energy',
    shortLabel: 'Core',
    description: 'Often watched for underlying inflation excluding volatile food and energy.',
  },
] as const;

export type CpiSeriesId = (typeof CPI_SERIES_OPTIONS)[number]['id'];

export const DEFAULT_CPI_SERIES_ID: CpiSeriesId = 'CPIAUCSL';

export function getCpiSeriesMeta(seriesId: string) {
  return CPI_SERIES_OPTIONS.find((s) => s.id === seriesId);
}
