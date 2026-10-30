// Checks the content in content/ and lists every problem, without building
// the site. Exits with 1 when there is any. Usage: npm run check:content
import { fileURLToPath } from 'node:url';
import { readContentFiles } from '../src/lib/content/read-files';
import { formatIssues, rules, validate } from '../src/lib/validation';

const root = fileURLToPath(new URL('..', import.meta.url));
const files = readContentFiles(root);
const issues = validate(files);

if (issues.length === 0) {
  console.log(`Content OK: ${Object.keys(files).length} files, ${rules.length} rules.`);
} else {
  const fileCount = new Set(issues.map((i) => i.file)).size;
  console.error(`${formatIssues(issues)}\n\n${issues.length} problem(s) in ${fileCount} file(s).`);
  process.exitCode = 1;
}
