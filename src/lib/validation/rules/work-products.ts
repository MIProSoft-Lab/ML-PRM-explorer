import { defaultLocale } from '../../../i18n/locales';
import { display, paths } from '../../content/files';
import type { Rule } from '../rule';

export const workProductFlow: Rule = {
  id: 'work-product-flow',
  description:
    'Every input of a version is an output of one of its processes or comes from outside (external), an external work product is not produced inside, and a work product has one name.',
  severity: 'error',
  check({ content, report }) {
    for (const v of content.versions) {
      const metaFile = paths.workProducts(v.id);
      const used = new Set<string>();
      for (const wp of content.getWorkProducts(v.id, defaultLocale)) {
        used.add(wp.id);
        if (wp.producers.length === 0 && !wp.external) {
          for (const c of wp.consumers) {
            report(
              paths.process(v.id, defaultLocale, c.process),
              `input ${wp.name} is not an output of any process of ${v.id}; if it comes from outside the project, mark ${wp.id} external in ${display(metaFile)}`,
            );
          }
        }
        if (wp.producers.length > 0 && wp.external) {
          report(metaFile, `${wp.id} is marked external, but ${wp.producers.map((p) => p.process).join(', ')} produce it`);
        }
      }

      // The site shows a work product under one name, so every process must use it.
      const names = new Map<string, { name: string; process: string }>();
      for (const id of content.processIds(v.id)) {
        const p = content.getProcess(v.id, id, defaultLocale).data;
        for (const io of [...p.inputs, ...p.outputs]) {
          const first = names.get(io.workProduct);
          if (!first) names.set(io.workProduct, { name: io.name, process: id });
          else if (first.name !== io.name) {
            report(paths.process(v.id, defaultLocale, id), `${io.workProduct} is called "${io.name}" here and "${first.name}" in ${first.process}`);
          }
        }
      }

      for (const { id } of content.workProductMeta(v.id)) {
        if (!used.has(id)) report(metaFile, `${id} is not an input or output of any process of ${v.id}`);
      }
    }
  },
};

export const workProductDeadEnds: Rule = {
  id: 'work-product-dead-ends',
  description:
    'Every work product a process produces is used by another process, except records, which are kept as evidence of what was done.',
  severity: 'warning',
  check({ content, report }) {
    for (const v of content.versions) {
      for (const wp of content.getWorkProducts(v.id, defaultLocale)) {
        if (wp.type === 'record' || wp.external || wp.consumers.length > 0) continue;
        for (const p of wp.producers) {
          report(paths.process(v.id, defaultLocale, p.process), `output ${wp.name} is not an input of any process`);
        }
      }
    }
  },
};
