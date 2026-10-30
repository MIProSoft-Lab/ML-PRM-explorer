// A problem found in the content, and how the problems are shown.
import { display } from '../content/files';

export type Severity = 'error' | 'warning';

export interface Issue {
  /** The file to fix, as "/content/…". */
  file: string;
  message: string;
  /** The check that found it: a rule ID, or "files" for the reading of the files. */
  rule: string;
  severity: Severity;
}

/** Reports a problem in a file. */
export type Reporter = (file: string, message: string) => void;

export class Report {
  readonly issues: Issue[] = [];

  /** A reporter that tags its issues with a rule. */
  for(rule: string, severity: Severity = 'error'): Reporter {
    return (file, message) => this.issues.push({ file, message, rule, severity });
  }
}

export const errors = (issues: Issue[]) => issues.filter((i) => i.severity === 'error');
export const warnings = (issues: Issue[]) => issues.filter((i) => i.severity === 'warning');

/** The issues grouped by file, for the terminal and the build log. */
export function formatIssues(issues: Issue[]): string {
  const byFile = new Map<string, Issue[]>();
  for (const issue of issues) byFile.set(issue.file, [...(byFile.get(issue.file) ?? []), issue]);
  return [...byFile.keys()]
    .sort()
    .map((file) => {
      const lines = byFile.get(file)!.map((i) => `  - ${i.message.replace(/\n/g, '\n    ')} (${i.severity === 'warning' ? 'warning: ' : ''}${i.rule})`);
      return `${display(file)}\n${lines.join('\n')}`;
    })
    .join('\n\n');
}
