import { defaultLocale, locales } from '../../../i18n/locales';
import { display, paths } from '../../content/files';
import type { Process } from '../../content/schemas';
import type { Rule } from '../rule';
import { processFiles } from '../walk';

/** The parts of a process a translation must not change: IDs, not text. */
function structure(p: Process) {
  return JSON.stringify([
    p.outcomes.map((o) => o.id),
    p.activities.map((a) => a.id),
    p.inputs.map((i) => i.workProduct),
    p.outputs.map((o) => o.workProduct),
  ]);
}

export const processTranslations: Rule = {
  id: 'process-translations',
  description: 'A translated process has the same outcomes, activities, inputs and outputs as the English one.',
  severity: 'error',
  check({ content, report }) {
    for (const { file, version, locale, id, process } of processFiles(content)) {
      if (locale === defaultLocale) continue;
      const english = content.getProcess(version, id, defaultLocale).data;
      if (structure(process) !== structure(english)) {
        report(file, 'outcomes, activities, inputs or outputs differ from the English version');
      }
    }
  },
};

const placeholders = (s: string) =>
  [...s.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(', ');

export const uiTranslations: Rule = {
  id: 'ui-translations',
  description: 'Translated interface strings exist in English and use the same {placeholders}.',
  severity: 'error',
  check({ content, report }) {
    const en = content.uiStrings(defaultLocale) ?? {};
    const enFile = display(paths.ui(defaultLocale));
    for (const locale of locales) {
      if (locale === defaultLocale) continue;
      const file = paths.ui(locale);
      for (const [key, text] of Object.entries(content.uiStrings(locale) ?? {})) {
        if (en[key] === undefined) report(file, `${key} does not exist in ${enFile}`);
        else if (placeholders(text) !== placeholders(en[key])) {
          report(file, `${key} must use the placeholders {${placeholders(en[key]) || '…'}} of the English text`);
        }
      }
    }
  },
};
