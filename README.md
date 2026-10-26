# ML Process Reference Model explorer

A website to explore the Process Reference Model (PRM) for Machine Learning from the doctoral thesis. Anyone can browse it without signing in; admins edit the model from `/admin` with their GitHub account.

- **Process map** of each PRM version, coloured by origin, with full-text search.
- **Process pages** with purpose, outcomes, inputs, outputs, activities, the sources of each activity, traceability to the ISO/IEC standards and the workshop annotations that changed it.
- **Work products**: which process produces each input and which processes use each output.
- **Compare versions**: word-level diff of every process between two versions.
- **Lifecycle templates** that arrange the processes of a version into phases and iterations.
- **Tailoring**: select processes and activities for a project, see inputs left without a producer, and export a Markdown checklist, CSV or JSON. The selection lives in the link.
- **English, Spanish and Catalan**, with a notice wherever a translation is still missing.

## Development

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/, fails on broken content
```

Requires Node 22.12 or newer.

## Content

All content is YAML under `content/`. The site is generated from it; nothing else holds model data.

```
content/
  site.yaml                         title and introduction, per language
  versions.yaml                     PRM versions, the default one, and the process map layout
  studies.yaml                      primary studies of the SLR (P1–P18)
  references.yaml                   bibliography used by the activities
  prm/<version>/
    processes/<lang>/P01.yaml …     one file per process and language
    work-products.yaml              type of each work product (information item, artifact, record)
  lifecycles/<lang>/<id>.yaml       lifecycle templates
```

Text fields accept `*emphasis*` and `**bold**`.

The build checks the content and stops with a message naming the file when something is inconsistent: an input that serves an outcome letter that does not exist, an activity that cites an unknown study or reference, a lifecycle that lists a process missing from its PRM version, or a translation whose outcomes, activities, inputs or outputs differ from the English file.

### Translations

The English files are the reference. To translate a process, copy `content/prm/v2/processes/en/P09.yaml` to `content/prm/v2/processes/es/P09.yaml` and translate the text, keeping the IDs, outcome letters, work product IDs and sources. Untranslated processes are shown in English with a notice. The admin panel shows the languages side by side and copies the fields that are not translated.

Interface strings are in `src/i18n/ui.ts`.

### New PRM version

```sh
npm run new-version -- v3              # copy of the default version
npm run new-version -- v3 --from v1
```

This copies the process files, drops the workshop annotations (they belong to the version they produced), and adds the version to `versions.yaml` as a draft. Edit it from the admin panel, then set its status to `current` and make it the default.

### Re-importing from the thesis

The content was imported once from the LaTeX sources of the thesis:

```sh
npm run import-thesis -- "<path to the thesis LaTeX folder>"            # skips existing files
npm run import-thesis -- "<path to the thesis LaTeX folder>" --force    # overwrites them
```

It reads `tables/prm/v1`, `tables/prm/v2`, the PRM overview, information items, standards mapping and workshop change tables, the selected studies and `references.bib`. After the import the YAML files are the source of truth; `--force` discards edits made since.

## Publishing on GitHub Pages

1. Push the repository to GitHub with `main` as the default branch.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Every push to `main` builds and deploys the site; pull requests are built to check them.

## Admin access

The admin panel at `/admin` is [Sveltia CMS](https://github.com/sveltia/sveltia-cms). Edits are saved as commits to the repository, which redeploys the site, so the history of every change to the PRM is in git.

Only people with write access to the repository can save changes. Add admins as collaborators in **Settings → Collaborators**.

Admins can sign in in two ways:

- **Access token** (no setup): create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) for this repository with *Contents: Read and write*, and paste it in **Sign In Using Access Token**.
- **Sign in with GitHub**: deploy [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) to Cloudflare Workers (free) and set its URL as the repository variable `CMS_AUTH_URL` in **Settings → Secrets and variables → Actions → Variables**.

In Chrome or Edge, **Work with Local Repository** edits a local clone directly, without signing in; commit and push the changes yourself.
