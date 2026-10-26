// Loads the YAML content, validates it and derives the views the pages need.
// Every page imports from here, so a broken edit fails the build with a
// message that names the file and the field.
import { z } from 'astro/zod';
import { parse } from 'yaml';
import { defaultLocale, locales, type Locale } from '../i18n/ui';

const files = import.meta.glob<string>('/content/**/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const cache = new Map<string, unknown>();

function load<T>(path: string, schema: z.ZodType<T>): T {
  if (cache.has(path)) return cache.get(path) as T;
  const data = parseFile(path, schema);
  cache.set(path, data);
  return data;
}

function parseFile<T>(path: string, schema: z.ZodType<T>): T {
  const raw = files[path];
  if (raw === undefined) throw new Error(`Missing content file ${path}`);
  const result = schema.safeParse(parse(raw));
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid content in ${path}:\n${issues}`);
  }
  return result.data;
}

// --- Schemas -------------------------------------------------------------

const localized = z.object({ en: z.string() }).catchall(z.string());
const processId = z.string().regex(/^P\d{2}$/);

const ioSchema = z.object({
  workProduct: z.string(),
  name: z.string(),
  description: z.string().default(''),
  serves: z.array(z.string()).default([]),
  optional: z.boolean().optional(),
});

const activitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  primaryStudies: z.array(z.string()).optional(),
  literature: z.array(z.string()).optional(),
});

const traceSchema = z.object({
  standard: z.string(),
  standardProcess: z.string().optional(),
  activity: z.string(),
  prmActivity: z.string().optional(),
  note: z.string().optional(),
});

const changeSchema = z.object({
  annotation: z.string(),
  raisedElsewhere: z.boolean().optional(),
  text: z.string(),
  redVotes: z.number().nullable().optional(),
  yellowVotes: z.number().nullable().optional(),
  decision: z.string(),
  changes: z
    .array(z.object({ kind: z.enum(['added', 'updated', 'removed']), target: z.string().optional(), text: z.string() }))
    .default([]),
});

const processSchema = z.object({
  id: processId,
  number: z.number(),
  origin: z.enum(['standards-and-literature', 'standards-only', 'decomposed']),
  name: z.string(),
  purpose: z.string(),
  outcomes: z.array(z.object({ id: z.string(), text: z.string() })),
  inputs: z.array(ioSchema).default([]),
  outputs: z.array(ioSchema).default([]),
  activities: z.array(activitySchema),
  standards: z.array(traceSchema).optional(),
  changes: z.array(changeSchema).optional(),
});

const versionsSchema = z.object({
  default: z.string(),
  versions: z.array(
    z.object({
      id: z.string(),
      status: z.enum(['draft', 'current', 'superseded']),
      title: localized,
      description: localized,
      topology: z.array(z.object({ group: localized, columns: z.array(z.array(processId)) })),
    }),
  ),
});

const workProductsSchema = z.object({
  workProducts: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['information-item', 'artifact', 'record']),
      external: z.boolean().default(false),
    }),
  ),
});

const lifecycleSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['draft', 'published']).default('draft'),
  prmVersion: z.string(),
  description: z.string().default(''),
  source: z.string().optional(),
  phases: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      processes: z.array(processId),
      iterative: z.boolean().optional(),
      returnsTo: z.string().optional(),
      returnNote: z.string().optional(),
    }),
  ),
});

const studiesSchema = z.object({
  studies: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      year: z.number(),
      source: z.string(),
      type: z.string(),
      reference: z.string().nullable().optional(),
    }),
  ),
});

const referencesSchema = z.object({
  references: z.array(
    z.object({
      key: z.string(),
      authors: z.string().default(''),
      title: z.string().default(''),
      year: z.union([z.string(), z.number()]).transform(String).default(''),
      venue: z.string().optional(),
      publisher: z.string().optional(),
      doi: z.string().optional(),
      url: z.string().optional(),
    }),
  ),
});

const siteSchema = z.object({
  title: localized,
  author: z.string(),
  institution: z.string().optional(),
  intro: localized,
});

export type Process = z.infer<typeof processSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Lifecycle = z.infer<typeof lifecycleSchema>;
export type Version = z.infer<typeof versionsSchema>['versions'][number];
export type Study = z.infer<typeof studiesSchema>['studies'][number];
export type Reference = z.infer<typeof referencesSchema>['references'][number];
export type WorkProductType = z.infer<typeof workProductsSchema>['workProducts'][number]['type'];

// --- Accessors -----------------------------------------------------------

/** Pick the text for a locale from a localized map, falling back to English. */
export function pick(map: Record<string, string>, locale: Locale): string {
  return map[locale] ?? map[defaultLocale];
}

export const site = load('/content/site.yaml', siteSchema);
const versionsFile = load('/content/versions.yaml', versionsSchema);
export const versions = versionsFile.versions;
export const defaultVersion = versionsFile.default;
export const studies = load('/content/studies.yaml', studiesSchema).studies;
export const references = load('/content/references.yaml', referencesSchema).references;

export function getVersion(id: string): Version {
  const v = versions.find((v) => v.id === id);
  if (!v) throw new Error(`Unknown PRM version ${id}`);
  return v;
}

export interface Localized<T> {
  data: T;
  /** False when the locale has no file and the English text is shown. */
  translated: boolean;
}

function localizedFile<T>(base: string, locale: Locale, schema: z.ZodType<T>): Localized<T> | undefined {
  const own = `${base.replace('{locale}', locale)}`;
  if (files[own] !== undefined) return { data: load(own, schema), translated: true };
  const fallback = base.replace('{locale}', defaultLocale);
  if (files[fallback] !== undefined) return { data: load(fallback, schema), translated: locale === defaultLocale };
  return undefined;
}

export function processIds(version: string): string[] {
  const prefix = `/content/prm/${version}/processes/${defaultLocale}/`;
  return Object.keys(files)
    .filter((f) => f.startsWith(prefix))
    .map((f) => f.slice(prefix.length, -'.yaml'.length))
    .sort();
}

export function getProcess(version: string, id: string, locale: Locale): Localized<Process> {
  const p = localizedFile(`/content/prm/${version}/processes/{locale}/${id}.yaml`, locale, processSchema);
  if (!p) throw new Error(`Unknown process ${version}/${id}`);
  return p;
}

export function getProcesses(version: string, locale: Locale): Localized<Process>[] {
  return processIds(version).map((id) => getProcess(version, id, locale));
}

export function lifecycleIds(): string[] {
  const prefix = `/content/lifecycles/${defaultLocale}/`;
  return Object.keys(files)
    .filter((f) => f.startsWith(prefix))
    .map((f) => f.slice(prefix.length, -'.yaml'.length))
    .sort();
}

export function getLifecycle(id: string, locale: Locale): Localized<Lifecycle> {
  const l = localizedFile(`/content/lifecycles/{locale}/${id}.yaml`, locale, lifecycleSchema);
  if (!l) throw new Error(`Unknown lifecycle ${id}`);
  return l;
}

// --- Work product flow ---------------------------------------------------

export interface WorkProductLink {
  process: string;
  serves: string[];
  description: string;
  optional?: boolean;
}

export interface WorkProduct {
  id: string;
  name: string;
  type: WorkProductType;
  external: boolean;
  producers: WorkProductLink[];
  consumers: WorkProductLink[];
}

/** Work products of a version, with the processes that produce and use them. */
export function getWorkProducts(version: string, locale: Locale): WorkProduct[] {
  const meta = new Map(
    (files[`/content/prm/${version}/work-products.yaml`] !== undefined
      ? load(`/content/prm/${version}/work-products.yaml`, workProductsSchema).workProducts
      : []
    ).map((w) => [w.id, w]),
  );
  const byId = new Map<string, WorkProduct>();
  const entry = (id: string, name: string) => {
    let wp = byId.get(id);
    if (!wp) {
      const m = meta.get(id);
      wp = { id, name, type: m?.type ?? 'information-item', external: m?.external ?? false, producers: [], consumers: [] };
      byId.set(id, wp);
    }
    return wp;
  };
  for (const { data: p } of getProcesses(version, locale)) {
    for (const io of p.outputs) {
      entry(io.workProduct, io.name).producers.push({ process: p.id, serves: io.serves, description: io.description, optional: io.optional });
    }
    for (const io of p.inputs) {
      entry(io.workProduct, io.name).consumers.push({ process: p.id, serves: io.serves, description: io.description, optional: io.optional });
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, locale));
}

// --- Validation ----------------------------------------------------------

/** Cross-reference checks the schemas cannot express. Returns error messages. */
export function validate(): string[] {
  const errors: string[] = [];
  const studyIds = new Set(studies.map((s) => s.id));
  const refKeys = new Set(references.map((r) => r.key));
  if (!versions.some((v) => v.id === defaultVersion)) errors.push(`versions.yaml: default version ${defaultVersion} does not exist`);

  for (const v of versions) {
    const ids = new Set(processIds(v.id));
    if (ids.size === 0) errors.push(`content/prm/${v.id}: no English process files`);
    for (const g of v.topology) for (const col of g.columns) for (const id of col) {
      if (!ids.has(id)) errors.push(`versions.yaml: ${v.id} topology lists ${id}, which has no file`);
    }
    for (const locale of locales) {
      for (const id of ids) {
        const where = `content/prm/${v.id}/processes/${locale}/${id}.yaml`;
        const { data: p, translated } = getProcess(v.id, id, locale);
        if (!translated && locale !== defaultLocale) continue;
        if (p.id !== id) errors.push(`${where}: id is ${p.id}, expected ${id}`);
        const outcomes = new Set(p.outcomes.map((o) => o.id));
        for (const io of [...p.inputs, ...p.outputs]) {
          for (const s of io.serves) {
            if (!outcomes.has(s)) errors.push(`${where}: ${io.name} serves outcome (${s}), which does not exist`);
          }
        }
        for (const a of p.activities) {
          for (const s of a.primaryStudies ?? []) if (!studyIds.has(s)) errors.push(`${where}: ${a.id} cites unknown study ${s}`);
          for (const k of a.literature ?? []) if (!refKeys.has(k)) errors.push(`${where}: ${a.id} cites unknown reference ${k}`);
        }
        if (locale !== defaultLocale) {
          const en = getProcess(v.id, id, defaultLocale).data;
          const shape = (x: Process) =>
            JSON.stringify([x.outcomes.map((o) => o.id), x.activities.map((a) => a.id), x.inputs.map((i) => i.workProduct), x.outputs.map((o) => o.workProduct)]);
          if (shape(en) !== shape(p)) {
            errors.push(`${where}: outcomes, activities, inputs or outputs differ from the English version`);
          }
        }
      }
    }
  }

  for (const id of lifecycleIds()) {
    for (const locale of locales) {
      const { data: l, translated } = getLifecycle(id, locale);
      if (!translated && locale !== defaultLocale) continue;
      const where = `content/lifecycles/${locale}/${id}.yaml`;
      if (!versions.some((v) => v.id === l.prmVersion)) {
        errors.push(`${where}: unknown PRM version ${l.prmVersion}`);
        continue;
      }
      const ids = new Set(processIds(l.prmVersion));
      const phases = new Set(l.phases.map((p) => p.id));
      for (const ph of l.phases) {
        for (const pid of ph.processes) if (!ids.has(pid)) errors.push(`${where}: phase ${ph.id} lists unknown process ${pid}`);
        if (ph.returnsTo && !phases.has(ph.returnsTo)) errors.push(`${where}: phase ${ph.id} returns to unknown phase ${ph.returnsTo}`);
      }
    }
  }
  return errors;
}
