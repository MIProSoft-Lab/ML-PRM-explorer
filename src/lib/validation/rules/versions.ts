import { defaultLocale } from '../../../i18n/locales';
import { paths } from '../../content/files';
import type { Rule } from '../rule';

export const versions: Rule = {
  id: 'versions',
  description: 'The default version exists, no version is called "latest", and every version has processes for each process in its topology.',
  check({ content, report }) {
    const file = paths.versions;
    if (!content.versions.some((v) => v.id === content.defaultVersion)) {
      report(file, `default version ${content.defaultVersion} does not exist`);
    }
    if (content.versions.some((v) => v.id === 'latest')) {
      report(file, 'the version ID "latest" is reserved for links to the default version');
    }
    for (const v of content.versions) {
      const ids = new Set(content.processIds(v.id));
      if (ids.size === 0) report(paths.processDir(v.id, defaultLocale), `version ${v.id} has no English process files`);
      for (const group of v.topology) {
        for (const column of group.columns) {
          for (const id of column) if (!ids.has(id)) report(file, `${v.id} topology lists ${id}, which has no file`);
        }
      }
    }
  },
};
