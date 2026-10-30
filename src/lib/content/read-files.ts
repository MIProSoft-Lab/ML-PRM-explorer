// Reads the content files from the disk, keyed as import.meta.glob keys them,
// for the checks that run outside Astro (the check:content script and tests).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { ContentFiles } from './files';

/** The YAML files under <root>/content, as "/content/…" → text. */
export function readContentFiles(root: string): ContentFiles {
  const files: ContentFiles = {};
  const dir = join(root, 'content');
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue;
    const path = join(entry.parentPath, entry.name);
    files[`/${relative(root, path).split(sep).join('/')}`] = readFileSync(path, 'utf8');
  }
  return files;
}
