# render-analysis

Builds static HTML pages from a finished code-analysis run, with `../page-components`. Reads the run's
`analysis.sqlite` and review files read-only; writes only the output folder. Does not touch the code-analysis skill.

```bash
bun .agents/shared/render-analysis/render.tsx \
  --root .kartris-claude-code-analysis \
  --source . \
  --out .kartris-claude-code-analysis/pages
```

Prints, per kind of record, how many are in the store and how many are on a page (a GAP means a record is missing),
and the link and leak checks; exits 1 on any gap, broken link or record id shown. Open `pages/index.html`.
