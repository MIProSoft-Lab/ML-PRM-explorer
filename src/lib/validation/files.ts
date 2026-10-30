// The first pass: every file is where the site looks for it, is valid YAML and
// matches its schema. It reports every problem in every file, where the site
// itself stops at the first file it cannot read.
import { defaultLocale, isLocale, locales } from '../../i18n/locales';
import { display, kindOf, paths, parseYaml, type ContentFiles } from '../content/files';
import type { Reporter } from './issues';

/** The files the site cannot be built without. */
const requiredFiles = [paths.site, paths.versions, paths.studies, paths.references, paths.ui(defaultLocale)];

/** Checks the files. Returns false when a file cannot be read, so the rules cannot run. */
export function checkFiles(files: ContentFiles, report: Reporter): boolean {
  let readable = true;

  for (const file of requiredFiles) {
    if (files[file] === undefined) {
      report(file, 'the file is missing');
      readable = false;
    }
  }

  for (const [file, text] of Object.entries(files)) {
    const match = kindOf(file);
    if (!match) {
      report(file, 'the site does not read this file: move it to where its kind of content belongs, or delete it');
      continue;
    }
    const { locale, version, id } = match.groups;
    if (locale !== undefined && !isLocale(locale)) {
      report(file, `"${locale}" is not one of the languages of the site (${locales.join(', ')})`);
      continue;
    }
    if (locale !== undefined && locale !== defaultLocale && id !== undefined) {
      const english = match.kind.name === 'process' ? paths.process(version, defaultLocale, id) : paths.lifecycle(defaultLocale, id);
      if (files[english] === undefined) report(file, `translation of ${display(english)}, which does not exist`);
    }
    const result = parseYaml(text, match.kind.schema);
    if (!result.ok) {
      for (const problem of result.problems) report(file, problem);
      readable = false;
    }
  }
  return readable;
}
