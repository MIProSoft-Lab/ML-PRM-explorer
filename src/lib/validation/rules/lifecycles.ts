import { defaultLocale } from '../../../i18n/locales';
import type { Rule } from '../rule';
import { lifecycleFiles } from '../walk';

export const lifecycles: Rule = {
  id: 'lifecycles',
  description: 'A lifecycle uses a PRM version that exists, its phases list processes of that version, and phases return to phases that exist.',
  severity: 'error',
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

export const lifecycleDataflow: Rule = {
  id: 'lifecycle-dataflow',
  description:
    'In a lifecycle, every required input of a process is external or produced in the same phase, an earlier one, or a later one that returns to it.',
  severity: 'warning',
  check({ content, report }) {
    for (const { file, locale, lifecycle } of lifecycleFiles(content)) {
      if (locale !== defaultLocale || !content.versions.some((v) => v.id === lifecycle.prmVersion)) continue;
      const version = lifecycle.prmVersion;
      const known = new Set(content.processIds(version));
      const phaseOf = new Map<string, number>();
      lifecycle.phases.forEach((ph, i) => ph.processes.forEach((pid) => phaseOf.set(pid, i)));
      const workProducts = new Map(content.getWorkProducts(version, defaultLocale).map((w) => [w.id, w]));
      // A phase that returns to an earlier one repeats every phase in between.
      const loops = lifecycle.phases.flatMap((ph, end) => {
        const start = lifecycle.phases.findIndex((p) => p.id === ph.returnsTo);
        return start >= 0 && start <= end ? [{ start, end }] : [];
      });

      lifecycle.phases.forEach((ph, i) => {
        for (const pid of ph.processes) {
          if (!known.has(pid)) continue;
          for (const input of content.getProcess(version, pid, defaultLocale).data.inputs) {
            const wp = workProducts.get(input.workProduct)!;
            // An input no process produces is reported by work-product-flow.
            if (input.optional || wp.external || wp.producers.length === 0) continue;
            const producers = wp.producers.map((p) => p.process);
            const phases = producers.flatMap((p) => (phaseOf.has(p) ? [phaseOf.get(p)!] : []));
            if (phases.length === 0) {
              report(file, `phase ${ph.id}: ${pid} needs ${wp.name}, which no process of the lifecycle produces (${producers.join(', ')} in ${version})`);
              continue;
            }
            const first = Math.min(...phases);
            if (first <= i || loops.some((l) => l.start <= i && l.end >= first)) continue;
            report(file, `phase ${ph.id}: ${pid} needs ${wp.name}, which is first produced in the later phase ${lifecycle.phases[first].id}`);
          }
        }
      });
    }
  },
};
