// The languages of the site. Kept apart from ui.ts, which reads the interface
// strings at import time, so the content checks can use them outside Astro.

export const locales = ['en', 'es', 'ca'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export function isLocale(x: string | undefined): x is Locale {
  return (locales as readonly string[]).includes(x ?? '');
}
