// The content files as Vite bundles them into the site. Only the site imports
// this: the checks read the same files from the disk (read-files.ts).
import type { ContentFiles } from './files';

export const contentFiles: ContentFiles = import.meta.glob<string>('/content/**/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});
