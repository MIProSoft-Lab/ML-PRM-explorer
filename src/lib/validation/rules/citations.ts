import { paths } from '../../content/files';
import type { Rule } from '../rule';
import { processFiles } from '../walk';

export const citations: Rule = {
  id: 'citations',
  description: 'Activities cite studies in studies.yaml and references in references.yaml, and a study points to a reference that exists.',
  severity: 'error',
  check({ content, report }) {
    const studyIds = new Set(content.studies.map((s) => s.id));
    const refKeys = new Set(content.references.map((r) => r.key));
    for (const s of content.studies) {
      if (s.reference && !refKeys.has(s.reference)) report(paths.studies, `${s.id} points to unknown reference ${s.reference}`);
    }
    for (const { file, process } of processFiles(content)) {
      for (const a of process.activities) {
        for (const s of a.primaryStudies ?? []) if (!studyIds.has(s)) report(file, `${a.id} cites unknown study ${s}`);
        for (const k of a.literature ?? []) if (!refKeys.has(k)) report(file, `${a.id} cites unknown reference ${k}`);
      }
    }
  },
};
