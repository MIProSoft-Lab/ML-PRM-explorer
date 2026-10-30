import type { Rule } from '../rule';
import { lifecycleFiles } from '../walk';

export const lifecycles: Rule = {
  id: 'lifecycles',
  description: 'A lifecycle uses a PRM version that exists, its phases list processes of that version, and phases return to phases that exist.',
  check({ content, report }) {
    for (const { file, lifecycle } of lifecycleFiles(content)) {
      if (!content.versions.some((v) => v.id === lifecycle.prmVersion)) {
        report(file, `unknown PRM version ${lifecycle.prmVersion}`);
        continue;
      }
      const ids = new Set(content.processIds(lifecycle.prmVersion));
      const phases = new Set(lifecycle.phases.map((p) => p.id));
      for (const ph of lifecycle.phases) {
        for (const pid of ph.processes) if (!ids.has(pid)) report(file, `phase ${ph.id} lists unknown process ${pid}`);
        if (ph.returnsTo && !phases.has(ph.returnsTo)) report(file, `phase ${ph.id} returns to unknown phase ${ph.returnsTo}`);
      }
    }
  },
};
