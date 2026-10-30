import type { Rule } from '../rule';
import { processFiles } from '../walk';

export const processIds: Rule = {
  id: 'process-id',
  description: 'The id in a process file matches the name of the file.',
  check({ content, report }) {
    for (const { file, id, process } of processFiles(content)) {
      if (process.id !== id) report(file, `id is ${process.id}, expected ${id}`);
    }
  },
};

export const processOutcomes: Rule = {
  id: 'process-outcomes',
  description: 'The inputs and outputs of a process serve outcomes of that process.',
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
