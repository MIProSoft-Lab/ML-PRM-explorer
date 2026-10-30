// The process and lifecycle files the site shows, for rules that check each
// one: the English file, and the translations that exist. A language without
// its own file shows the English one, which is checked once, as English.
import { defaultLocale, locales, type Locale } from '../../i18n/locales';
import { paths } from '../content/files';
import type { Content } from '../content/model';
import type { Lifecycle, Process } from '../content/schemas';

export interface ProcessFile {
  file: string;
  version: string;
  locale: Locale;
  id: string;
  process: Process;
}

export function* processFiles(content: Content): Generator<ProcessFile> {
  for (const v of content.versions) {
    for (const id of content.processIds(v.id)) {
      for (const locale of locales) {
        const { data, translated } = content.getProcess(v.id, id, locale);
        if (!translated && locale !== defaultLocale) continue;
        yield { file: paths.process(v.id, locale, id), version: v.id, locale, id, process: data };
      }
    }
  }
}

export interface LifecycleFile {
  file: string;
  locale: Locale;
  id: string;
  lifecycle: Lifecycle;
}

export function* lifecycleFiles(content: Content): Generator<LifecycleFile> {
  for (const id of content.lifecycleIds()) {
    for (const locale of locales) {
      const { data, translated } = content.getLifecycle(id, locale);
      if (!translated && locale !== defaultLocale) continue;
      yield { file: paths.lifecycle(locale, id), locale, id, lifecycle: data };
    }
  }
}
