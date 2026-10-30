// A check of the content. Rules run once every file has been read and
// matches its schema, so they work on the parsed content and only check what
// the schemas cannot express: references between files, translations, etc.
import type { ContentFiles } from '../content/files';
import type { Content } from '../content/model';
import type { Reporter, Severity } from './issues';

export interface RuleContext {
  files: ContentFiles;
  content: Content;
  report: Reporter;
}

export interface Rule {
  /** Short kebab-case name, shown next to each issue. */
  id: string;
  /** What the rule makes sure of, in one sentence. */
  description: string;
  /** An error fails the build; a warning is listed and left to the author's judgement. */
  severity: Severity;
  check(ctx: RuleContext): void;
}
