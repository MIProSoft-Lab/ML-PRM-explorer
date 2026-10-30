// The checks of the whole content. They run in every build (src/layouts/
// Layout.astro) and on their own with `npm run check:content`.
//
// To add a check, write a Rule in rules/ and list it below. A rule receives
// the parsed content, so it only has to check what the schemas in
// src/lib/content/schemas.ts cannot: references between files, translations,
// and the soundness of the model itself. An error stops the build; a warning
// is listed for the author to judge.
import type { ContentFiles } from '../content/files';
import { createContent } from '../content/model';
import { checkFiles } from './files';
import { Report, type Issue } from './issues';
import type { Rule } from './rule';
import { citations } from './rules/citations';
import { lifecycleDataflow, lifecycles } from './rules/lifecycles';
import { outcomeEvidence, processIds, processOutcomes, processUniqueIds } from './rules/processes';
import { processTranslations, uiTranslations } from './rules/translations';
import { versions } from './rules/versions';
import { workProductDeadEnds, workProductFlow } from './rules/work-products';

export { errors, formatIssues, warnings, type Issue } from './issues';
export type { Rule } from './rule';

export const rules: Rule[] = [
  // Errors: the content contradicts itself, and the build stops.
  versions,
  processIds,
  processUniqueIds,
  processOutcomes,
  citations,
  workProductFlow,
  processTranslations,
  lifecycles,
  uiTranslations,
  // Warnings: properties a sound process reference model should have, which
  // the author may accept to break with a reason.
  outcomeEvidence,
  workProductDeadEnds,
  lifecycleDataflow,
];

/** Checks the content files and returns every problem found, or none. */
export function validate(files: ContentFiles): Issue[] {
  const report = new Report();
  // The rules need every file parsed, so they only run when all can be read.
  if (!checkFiles(files, report.for('files'))) return report.issues;
  const content = createContent(files);
  for (const rule of rules) rule.check({ files, content, report: report.for(rule.id, rule.severity) });
  return report.issues;
}
