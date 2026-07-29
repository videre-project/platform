import { FORMATS } from '@videre-api/db/schema.g';
import type { FormatType } from '@videre-api/db/schema.g';

import type Env from './env';

export type Format = Lowercase<FormatType>;
export const RETIRED_FORMATS = [
  'extended',
  'classic',
] as const satisfies readonly Format[];
type RetiredFormat = typeof RETIRED_FORMATS[number];
export type SupportedFormat = Exclude<Format, RetiredFormat>;
export type ModelBindingName<Value extends Format = SupportedFormat> =
  `MANAFOLD_${Uppercase<Value>}`;

export const KNOWN_FORMATS = FORMATS.map(
  (format) => format.toLowerCase() as Format,
);
export const SUPPORTED_FORMATS = KNOWN_FORMATS.filter(
  (format): format is SupportedFormat =>
    !RETIRED_FORMATS.includes(format as RetiredFormat),
);

export function isKnownFormat(value: string): value is Format {
  return KNOWN_FORMATS.includes(value as Format);
}

export function isSupportedFormat(value: Format): value is SupportedFormat {
  return !RETIRED_FORMATS.includes(value as RetiredFormat);
}

export function getModelService(
  format: SupportedFormat,
  env: Env,
): Env[ModelBindingName] {
  const binding = `MANAFOLD_${format.toUpperCase()}` as ModelBindingName;
  return env[binding];
}
