/**
 * Phone helpers. Numbers are stored WhatsApp-style: international format,
 * digits only, no `+` — the country dial code immediately followed by the
 * subscriber number, e.g. `351912345678`.
 *
 * The UI edits the dial code (indicativo) and the local number separately
 * and persists the concatenation `${dialCode}${number}`.
 */

export interface DialCode {
  /** country name shown in the picker */
  label: string;
  /** numeric dial code, digits only, no leading `+` */
  code: string;
  /**
   * ISO 3166-1 alpha-2 code, lowercase. Drives the SVG flag via the
   * flag-icons class `fi fi-${iso2}` (renders on desktop, unlike emoji
   * regional-indicator flags which Windows browsers don't support).
   */
  iso2: string;
}

/**
 * Common dial codes. Used only for the picker/flag + recovering the code
 * from a stored number — any typed code is still accepted. When several
 * countries share a dial code (e.g. +1, +44, +7) the first entry wins as
 * the displayed flag.
 */
export const DIAL_CODES: DialCode[] = [
  { label: "Portugal", code: "351", iso2: "pt" },
  { label: "Brazil", code: "55", iso2: "br" },
  { label: "Spain", code: "34", iso2: "es" },
  { label: "France", code: "33", iso2: "fr" },
  { label: "Germany", code: "49", iso2: "de" },
  { label: "Italy", code: "39", iso2: "it" },
  { label: "United Kingdom", code: "44", iso2: "gb" },
  { label: "Ireland", code: "353", iso2: "ie" },
  { label: "Netherlands", code: "31", iso2: "nl" },
  { label: "Belgium", code: "32", iso2: "be" },
  { label: "Switzerland", code: "41", iso2: "ch" },
  { label: "Austria", code: "43", iso2: "at" },
  { label: "Luxembourg", code: "352", iso2: "lu" },
  { label: "Denmark", code: "45", iso2: "dk" },
  { label: "Sweden", code: "46", iso2: "se" },
  { label: "Norway", code: "47", iso2: "no" },
  { label: "Finland", code: "358", iso2: "fi" },
  { label: "Poland", code: "48", iso2: "pl" },
  { label: "Czechia", code: "420", iso2: "cz" },
  { label: "Greece", code: "30", iso2: "gr" },
  { label: "Romania", code: "40", iso2: "ro" },
  { label: "Ukraine", code: "380", iso2: "ua" },
  { label: "Russia", code: "7", iso2: "ru" },
  { label: "Turkey", code: "90", iso2: "tr" },
  { label: "USA / Canada", code: "1", iso2: "us" },
  { label: "Mexico", code: "52", iso2: "mx" },
  { label: "Argentina", code: "54", iso2: "ar" },
  { label: "Chile", code: "56", iso2: "cl" },
  { label: "Colombia", code: "57", iso2: "co" },
  { label: "Angola", code: "244", iso2: "ao" },
  { label: "Mozambique", code: "258", iso2: "mz" },
  { label: "Cape Verde", code: "238", iso2: "cv" },
  { label: "South Africa", code: "27", iso2: "za" },
  { label: "India", code: "91", iso2: "in" },
  { label: "China", code: "86", iso2: "cn" },
  { label: "Japan", code: "81", iso2: "jp" },
  { label: "South Korea", code: "82", iso2: "kr" },
  { label: "Australia", code: "61", iso2: "au" },
  { label: "United Arab Emirates", code: "971", iso2: "ae" },
];

/** Look up the first dial-code entry whose numeric code matches. */
export function dialCodeInfo(code: string): DialCode | undefined {
  const c = digitsOnly(code);
  return DIAL_CODES.find((d) => d.code === c);
}

/** Default dial code for new numbers (matches the original placeholder). */
export const DEFAULT_DIAL_CODE = "351";

/** Strip everything that isn't a digit. */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Split a stored number into a known dial code + local number. Picks the
 * longest matching code from {@link DIAL_CODES}; falls back to
 * {@link DEFAULT_DIAL_CODE} with the whole thing as the local number when
 * nothing matches.
 */
export function splitPhone(stored: string | null | undefined): {
  code: string;
  number: string;
} {
  const digits = digitsOnly(stored ?? "");
  if (!digits) return { code: DEFAULT_DIAL_CODE, number: "" };

  const match = [...DIAL_CODES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((d) => digits.startsWith(d.code));

  if (match) {
    return { code: match.code, number: digits.slice(match.code.length) };
  }
  return { code: DEFAULT_DIAL_CODE, number: digits };
}

/** Join a dial code + local number into the stored format, digits only. */
export function joinPhone(code: string, number: string): string {
  return `${digitsOnly(code)}${digitsOnly(number)}`;
}
