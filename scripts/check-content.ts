// Checks the content in content/ and lists every problem, without building
// the site. Exits with 1 when there is an error; warnings are only listed.
// Usage: npm run check:content
import { fileURLToPath } from 'node:url';
import { readContentFiles } from '../src/lib/content/read-files';
import { errors, formatIssues, rules, validate, warnings } from '../src/lib/validation';

const root = fileURLToPath(new URL('..', import.meta.url));
const files = readContentFiles(root);
const issues = validate(files);

const summary = `${Object.keys(files).length} files, ${rules.length} rules`;
if (issues.length === 0) {
  console.log(`Content OK: ${summary}.`);
} else {
  const fileCount = new Set(issues.map((i) => i.file)).size;
  const counts = `${errors(issues).length} error(s) and ${warnings(issues).length} warning(s) in ${fileCount} file(s)`;
  console.error(`${formatIssues(issues)}\n\n${counts} (${summary}).`);
  if (errors(issues).length) process.exitCode = 1;
}
