import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readContentFiles } from '../content/read-files';
import { fixture, toFiles, type Fixture } from './fixtures';
import { formatIssues, validate, type Issue } from './index';

const P01 = '/content/prm/v1/processes/en/P01.yaml';
const P01es = '/content/prm/v1/processes/es/P01.yaml';
const lifecycle = '/content/lifecycles/en/basic.yaml';

/** Validates the fixture after a change to it. */
function check(change: (f: Fixture) => void = () => {}): Issue[] {
  const f = fixture();
  change(f);
  return validate(toFiles(f));
}

/** The issues as "rule: file: message", easy to compare. */
const summary = (issues: Issue[]) => issues.map((i) => `${i.rule}: ${i.file}: ${i.message}`);

describe('the content of the repository', () => {
  it('passes every check', () => {
    const root = fileURLToPath(new URL('../../..', import.meta.url));
    const issues = validate(readContentFiles(root));
    expect(issues, formatIssues(issues)).toEqual([]);
  });
});

describe('the fixture', () => {
  it('passes every check', () => {
    expect(summary(check())).toEqual([]);
  });
});

describe('files', () => {
  it('reports invalid YAML with the file and the line', () => {
    const issues = check((f) => (f[P01] = 'id: P01\nname: [unclosed\n'));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ rule: 'files', file: P01 });
    expect(issues[0].message).toMatch(/line \d+/);
  });

  it('reports duplicate keys', () => {
    const issues = check((f) => (f[P01] = 'id: P01\nid: P02\n'));
    expect(issues[0]).toMatchObject({ rule: 'files', file: P01 });
    expect(issues[0].message).toMatch(/unique/i);
  });

  it('reports every schema problem with the path of the field', () => {
    const issues = check((f) => {
      f[P01].origin = 'somewhere';
      delete f[P01].outputs[0].name;
    });
    const messages = summary(issues).join('\n');
    expect(messages).toContain(`files: ${P01}: origin:`);
    expect(messages).toContain(`files: ${P01}: outputs[0].name:`);
  });

  it('reports problems in several files at once', () => {
    const issues = check((f) => {
      f[P01].number = 'one';
      f['/content/studies.yaml'].studies[0].year = 'recent';
    });
    expect(new Set(issues.map((i) => i.file))).toEqual(new Set([P01, '/content/studies.yaml']));
  });

  it('reports a missing required file', () => {
    expect(summary(check((f) => delete f['/content/references.yaml']))).toEqual([
      'files: /content/references.yaml: the file is missing',
    ]);
  });

  it('reports files the site does not read', () => {
    expect(summary(check((f) => (f['/content/prm/v1/P03.yaml'] = 'id: P03')))).toEqual([
      'files: /content/prm/v1/P03.yaml: the site does not read this file: move it to where its kind of content belongs, or delete it',
    ]);
  });

  it('reports a language the site does not have', () => {
    const issues = check((f) => (f['/content/prm/v1/processes/de/P01.yaml'] = f[P01]));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('"de" is not one of the languages');
  });

  it('reports a translation without an English file', () => {
    expect(summary(check((f) => (f['/content/prm/v1/processes/es/P03.yaml'] = { ...f[P01], id: 'P03' })))).toEqual([
      'files: /content/prm/v1/processes/es/P03.yaml: translation of content/prm/v1/processes/en/P03.yaml, which does not exist',
    ]);
  });

  it('skips the rules while a file cannot be read', () => {
    const issues = check((f) => {
      f[P01].number = 'one';
      f['/content/versions.yaml'].default = 'v9';
    });
    expect(issues.map((i) => i.rule)).toEqual(['files']);
  });
});

describe('rules', () => {
  it('versions: the default version exists', () => {
    expect(summary(check((f) => (f['/content/versions.yaml'].default = 'v9')))).toEqual([
      'versions: /content/versions.yaml: default version v9 does not exist',
    ]);
  });

  it('versions: "latest" is reserved', () => {
    const issues = check((f) => {
      f['/content/versions.yaml'].versions[0].id = 'latest';
      f['/content/versions.yaml'].default = 'latest';
    });
    expect(summary(issues)).toContain('versions: /content/versions.yaml: the version ID "latest" is reserved for links to the default version');
  });

  it('versions: the topology lists processes that have a file', () => {
    expect(summary(check((f) => f['/content/versions.yaml'].versions[0].topology[0].columns[0].push('P03')))).toEqual([
      'versions: /content/versions.yaml: v1 topology lists P03, which has no file',
    ]);
  });

  it('process-id: the id matches the file name', () => {
    expect(summary(check((f) => (f['/content/prm/v1/processes/en/P02.yaml'].id = 'P07')))).toEqual([
      'process-id: /content/prm/v1/processes/en/P02.yaml: id is P07, expected P02',
    ]);
  });

  it('process-outcomes: inputs and outputs serve existing outcomes', () => {
    expect(summary(check((f) => f['/content/prm/v1/processes/en/P02.yaml'].outputs[0].serves.push('z')))).toEqual([
      'process-outcomes: /content/prm/v1/processes/en/P02.yaml: Plan serves outcome (z), which does not exist',
    ]);
  });

  it('citations: activities cite known studies and references', () => {
    const issues = check((f) => {
      f['/content/prm/v1/processes/en/P02.yaml'].activities[0].primaryStudies = ['S9'];
      f['/content/prm/v1/processes/en/P02.yaml'].activities[0].literature = ['nobody2020'];
    });
    expect(summary(issues)).toEqual([
      'citations: /content/prm/v1/processes/en/P02.yaml: P02.1 cites unknown study S9',
      'citations: /content/prm/v1/processes/en/P02.yaml: P02.1 cites unknown reference nobody2020',
    ]);
  });

  it('process-translations: a translation keeps the IDs of the English file', () => {
    expect(summary(check((f) => (f[P01es].outcomes[0].id = 'b')))).toContain(
      `process-translations: ${P01es}: outcomes, activities, inputs or outputs differ from the English version`,
    );
  });

  it('lifecycles: the PRM version exists', () => {
    expect(summary(check((f) => (f[lifecycle].prmVersion = 'v9')))).toEqual([`lifecycles: ${lifecycle}: unknown PRM version v9`]);
  });

  it('lifecycles: phases list processes of the version and return to existing phases', () => {
    const issues = check((f) => {
      f[lifecycle].phases[0].processes.push('P09');
      f[lifecycle].phases[1].returnsTo = 'nowhere';
    });
    expect(summary(issues)).toEqual([
      `lifecycles: ${lifecycle}: phase start lists unknown process P09`,
      `lifecycles: ${lifecycle}: phase loop returns to unknown phase nowhere`,
    ]);
  });

  it('ui-translations: translated strings exist in English and keep the placeholders', () => {
    const issues = check((f) => {
      f['/content/ui/es.yaml'].nav.extra = 'Extra';
      f['/content/ui/es.yaml'].nav.count = '{total} procesos';
    });
    expect(summary(issues)).toEqual([
      'ui-translations: /content/ui/es.yaml: nav.count must use the placeholders {n} of the English text',
      'ui-translations: /content/ui/es.yaml: nav.extra does not exist in content/ui/en.yaml',
    ]);
  });
});

describe('formatIssues', () => {
  it('groups the issues by file', () => {
    const text = formatIssues([
      { file: '/content/b.yaml', message: 'two', rule: 'r' },
      { file: '/content/a.yaml', message: 'one', rule: 'r' },
      { file: '/content/b.yaml', message: 'three', rule: 's' },
    ]);
    expect(text).toBe('content/a.yaml\n  - one (r)\n\ncontent/b.yaml\n  - two (r)\n  - three (s)');
  });
});
