import { diffWords } from 'diff';
import type { Process } from './content';
import { escapeHtml, plain } from './text';

/** Word diff as HTML with <ins> and <del>. */
export function wordDiff(a: string, b: string) {
  return diffWords(plain(a), plain(b))
    .map((part) => {
      const text = escapeHtml(part.value);
      if (part.added) return `<ins>${text}</ins>`;
      if (part.removed) return `<del>${text}</del>`;
      return text;
    })
    .join('');
}

export type Status = 'same' | 'changed' | 'added' | 'removed';

export interface Pair<T> {
  status: Status;
  from?: T;
  to?: T;
}

function words(s: string) {
  return new Set(plain(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

function similarity(a: string, b: string) {
  const x = words(a);
  const y = words(b);
  const common = [...x].filter((w) => y.has(w)).length;
  return common / Math.max(1, Math.min(x.size, y.size));
}

/**
 * Pair the items of two lists. Items with the same key are paired first, then
 * the remaining ones by text similarity, so that renumbered or renamed
 * activities are still compared with their previous version.
 */
export function align<T>(from: T[], to: T[], key: (x: T) => string, text: (x: T) => string, same: (a: T, b: T) => boolean): Pair<T>[] {
  const used = new Set<number>();
  const match = new Map<number, number>();
  to.forEach((b, j) => {
    const i = from.findIndex((a, i) => !used.has(i) && key(a) === key(b));
    if (i >= 0) {
      used.add(i);
      match.set(j, i);
    }
  });
  to.forEach((b, j) => {
    if (match.has(j)) return;
    let best = -1;
    let score = 0.5;
    from.forEach((a, i) => {
      const s = used.has(i) ? 0 : similarity(text(a), text(b));
      if (s > score) {
        best = i;
        score = s;
      }
    });
    if (best >= 0) {
      used.add(best);
      match.set(j, best);
    }
  });
  const pairs: Pair<T>[] = [];
  to.forEach((b, j) => {
    const i = match.get(j);
    if (i === undefined) {
      pairs.push({ status: 'added', to: b });
      return;
    }
    // Removed items that came before this one keep their place in the list.
    from.forEach((a, k) => {
      if (k < i && !used.has(k) && !pairs.some((p) => p.from === a)) pairs.push({ status: 'removed', from: a });
    });
    pairs.push({ status: same(from[i], b) ? 'same' : 'changed', from: from[i], to: b });
  });
  from.forEach((a, k) => {
    if (!used.has(k) && !pairs.some((p) => p.from === a)) pairs.push({ status: 'removed', from: a });
  });
  return pairs;
}

type IO = Process['inputs'][number];
type Activity = Process['activities'][number];
type Outcome = Process['outcomes'][number];

export interface ProcessDiff {
  name: Status;
  purpose: Status;
  outcomes: Pair<Outcome>[];
  inputs: Pair<IO>[];
  outputs: Pair<IO>[];
  activities: Pair<Activity>[];
  changed: boolean;
  counts: Record<Exclude<Status, 'same'>, number>;
}

const ioSame = (a: IO, b: IO) => a.name === b.name && a.description === b.description && a.serves.join() === b.serves.join();

export function diffProcess(a: Process, b: Process): ProcessDiff {
  const d = {
    name: a.name === b.name ? 'same' : 'changed',
    purpose: a.purpose === b.purpose ? 'same' : 'changed',
    outcomes: align(a.outcomes, b.outcomes, (o) => o.text, (o) => o.text, (x, y) => x.text === y.text),
    inputs: align(a.inputs, b.inputs, (o) => o.workProduct, (o) => o.name, ioSame),
    outputs: align(a.outputs, b.outputs, (o) => o.workProduct, (o) => o.name, ioSame),
    activities: align(
      a.activities,
      b.activities,
      (x) => x.title,
      (x) => `${x.title} ${x.title} ${x.description}`,
      (x, y) => x.title === y.title && x.description === y.description,
    ),
  } as Omit<ProcessDiff, 'changed' | 'counts'>;
  const all = [...d.outcomes, ...d.inputs, ...d.outputs, ...d.activities];
  const counts = { changed: 0, added: 0, removed: 0 };
  for (const p of all) if (p.status !== 'same') counts[p.status]++;
  if (d.name !== 'same') counts.changed++;
  if (d.purpose !== 'same') counts.changed++;
  return { ...d, counts, changed: counts.changed + counts.added + counts.removed > 0 };
}
