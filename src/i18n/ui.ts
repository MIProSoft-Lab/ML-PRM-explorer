// Interface strings, read from content/ui/<locale>.yaml so they can be
// translated from the admin panel. English is the reference: a string missing
// in another language is shown in English. The PRM content is in content/ too.
import { parse } from 'yaml';

export const locales = ['en', 'es', 'ca'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/** A string's "section.key", e.g. "nav.processes", as in content/ui/en.yaml. */
export type UiKey = string;

const files = import.meta.glob<string>('/content/ui/*.yaml', { query: '?raw', import: 'default', eager: true });
const path = (locale: Locale) => `/content/ui/${locale}.yaml`;

/** The strings of a language as "section.key" → text. */
function read(locale: Locale): Record<UiKey, string> {
  const text = files[path(locale)];
  if (text === undefined) {
    if (locale === defaultLocale) throw new Error(`content/ui/${locale}.yaml is missing`);
    return {};
  }
  const where = `content/ui/${locale}.yaml`;
  const data: unknown = parse(text) ?? {};
  if (typeof data !== 'object' || Array.isArray(data)) throw new Error(`${where}: expected sections of strings`);
  const out: Record<UiKey, string> = {};
  for (const [section, entries] of Object.entries(data as Record<string, unknown>)) {
    if (!entries || typeof entries !== 'object' || Array.isArray(entries)) throw new Error(`${where}: section ${section} must contain strings`);
    for (const [key, value] of Object.entries(entries)) {
      if (typeof value !== 'string') throw new Error(`${where}: ${section}.${key} must be text`);
      out[`${section}.${key}`] = value;
    }
  }
  return out;
}

const ui = Object.fromEntries(locales.map((l) => [l, read(l)])) as Record<Locale, Record<UiKey, string>>;
const en = ui[defaultLocale];

/** Name of each language in that language, for the language menu. */
export const languageNames = Object.fromEntries(locales.map((l) => [l, ui[l]['language.name'] ?? l.toUpperCase()])) as Record<Locale, string>;

/** Name of a language as it appears inside a sentence of a locale. */
export function languageIn(locale: Locale, of: Locale) {
  return ui[locale][`language.${of}`] ?? en[`language.${of}`] ?? of;
}

export function useTranslations(locale: Locale) {
  return (key: UiKey, vars: Record<string, string | number> = {}) => {
    let s = ui[locale][key] ?? en[key];
    if (s === undefined) throw new Error(`Unknown interface string "${key}": add it to content/ui/${defaultLocale}.yaml`);
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}

/** Checks of the translations the reader would notice. Returns error messages. */
export function validateUi(): string[] {
  const errors: string[] = [];
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(', ');
  for (const locale of locales) {
    if (locale === defaultLocale) continue;
    const where = `content/ui/${locale}.yaml`;
    for (const [key, text] of Object.entries(ui[locale])) {
      if (en[key] === undefined) errors.push(`${where}: ${key} does not exist in content/ui/${defaultLocale}.yaml`);
      else if (placeholders(text) !== placeholders(en[key])) errors.push(`${where}: ${key} must use the placeholders {${placeholders(en[key]) || '…'}} of the English text`);
    }
  }
  return errors;
}

export function isLocale(x: string | undefined): x is Locale {
  return (locales as readonly string[]).includes(x ?? '');
}

/** Absolute path inside the site, honoring the configured base path. */
export function href(...segments: string[]) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = segments.filter(Boolean).join('/');
  return `${base}/${path}${path && !path.includes('#') && !path.includes('?') ? '/' : ''}`;
}
