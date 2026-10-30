import { defaultLocale } from '../../../i18n/locales';
import type { Rule } from '../rule';
import { processFiles } from '../walk';

export const processIds: Rule = {
  id: 'process-id',
  description: 'The id in a process file matches the name of the file.',
  severity: 'error',
  check({ content, report }) {
    for (const { file, id, process } of processFiles(content)) {
      if (process.id !== id) report(file, `id is ${process.id}, expected ${id}`);
    }
  },
};

export const processOutcomes: Rule = {
  id: 'process-outcomes',
  description: 'The inputs and outputs of a process serve outcomes of that process.',
  severity: 'error',
  check({ content, report }) {
    for (const { file, process } of processFiles(content)) {
      const outcomes = new Set(process.outcomes.map((o) => o.id));
      for (const io of [...process.inputs, ...process.outputs]) {
        for (const s of io.serves) {
          if (!outcomes.has(s)) report(file, `${io.name} serves outcome (${s}), which does not exist`);
        }
      }
    }
  },
};

export const processUniqueIds: Rule = {
  id: 'process-unique-ids',
  description: 'A process names each outcome and activity once, and lists a work product once among its inputs and once among its outputs.',
  severity: 'error',
  check({ content, report }) {
    for (const { file, process } of processFiles(content)) {
      const lists: [string, string[]][] = [
        ['outcome', process.outcomes.map((o) => o.id)],
        ['activity', process.activities.map((a) => a.id)],
        ['input', process.inputs.map((i) => i.workProduct)],
        ['output', process.outputs.map((o) => o.workProduct)],
      ];
      for (const [kind, ids] of lists) {
        for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) report(file, `${kind} ${id} appears more than once`);
      }
    }
  },
};

export const outcomeEvidence: Rule = {
  id: 'outcome-evidence',
  description:
    'Every outcome of a process is served by at least one of its outputs, the work product an assessor would look at to see it was achieved.',
  severity: 'warning',
  check({ content, report }) {
    for (const { file, locale, process } of processFiles(content)) {
      if (locale !== defaultLocale) continue;
      const evidenced = new Set(process.outputs.flatMap((o) => o.serves));
      const served = new Set(process.inputs.flatMap((i) => i.serves));
      for (const o of process.outcomes) {
        if (evidenced.has(o.id)) continue;
        report(file, `outcome (${o.id}) is served by no output${served.has(o.id) ? ', only by inputs' : ' or input'}`);
      }
    }
  },
};
