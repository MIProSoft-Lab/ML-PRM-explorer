// The checks of the whole content. They run in every build (src/layouts/
// Layout.astro) and on their own with `npm run check:content`.
//
// To add a check, write a Rule in rules/ and list it below. A rule receives
// the parsed content, so it only has to check what the schemas in
// src/lib/content/schemas.ts cannot: references between files, translations…
import type { ContentFiles } from '../content/files';
import { createContent } from '../content/model';
import { checkFiles } from './files';
import { Report, type Issue } from './issues';
import type { Rule } from './rule';
import { citations } from './rules/citations';
import { lifecycles } from './rules/lifecycles';
import { processIds, processOutcomes } from './rules/processes';
import { processTranslations, uiTranslations } from './rules/translations';
import { versions } from './rules/versions';

export { formatIssues, type Issue } from './issues';
export type { Rule } from './rule';

export const rules: Rule[] = [versions, processIds, processOutcomes, citations, processTranslations, lifecycles, uiTranslations];

/** Checks the content files and returns every problem found, or none. */
export function validate(files: ContentFiles): Issue[] {
  const report = new Report();
  // The rules need every file parsed, so they only run when all can be read.
  if (!checkFiles(files, report.for('files'))) return report.issues;
  const content = createContent(files);
  for (const rule of rules) rule.check({ files, content, report: report.for(rule.id) });
  return report.issues;
}
