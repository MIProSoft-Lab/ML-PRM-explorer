import { references, studies, type Reference } from './content';

export const referenceByKey = new Map(references.map((r) => [r.key, r]));
export const studyById = new Map(studies.map((s) => [s.id, s]));

/** "Khan et al., 2024" style label for a bibliography entry. */
export function shortCite(r: Reference | undefined, key = '') {
  if (!r) return key;
  const authors = r.authors.split(/\s+and\s+/).filter(Boolean);
  const surname = (a: string) => (a.includes(',') ? a.split(',')[0] : a).trim();
  let who = authors.length === 0 ? r.title : surname(authors[0]);
  if (authors.length === 2) who += ` & ${surname(authors[1])}`;
  if (authors.length > 2) who += ' et al.';
  return r.year ? `${who}, ${r.year}` : who;
}

export function fullCite(r: Reference) {
  const parts = [r.authors, r.year && `(${r.year})`, r.title && `${r.title}.`, r.venue && `*${r.venue}*.`, r.publisher && `${r.publisher}.`];
  return parts.filter(Boolean).join(' ');
}

export function referenceUrl(r: Reference) {
  if (r.doi) return `https://doi.org/${r.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}`;
  return r.url;
}
