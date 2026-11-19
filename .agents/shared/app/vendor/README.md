# vendor: the design system, synced, never edited here

`ui/` is a pinned copy of Continuum's UI package (`packages/ui/src`): the components the reader app uses, the `use-mobile` hook, `theme.css` and the Mulish fonts it loads. `ui/SOURCE.json` names the commit it came from and the SHA-256 of every file.

- Never edit a file under `ui/` by hand. `bun scripts/sync-ui.ts --check` (run by `bun run check` and `bun run build`) fails on any file that differs from `SOURCE.json`, is missing, or is not listed there.
- A component the app needs and Continuum lacks is added to Continuum UI first, through its registry (`shadcn add`, a flat file, a story for every state, as its `docs/components.md` says), then synced. Not there yet: `command`, `combobox`, `progress`.
- To take a newer version, or another component: commit it in Continuum, add its name to the list in `scripts/sync-ui.ts` (with every component it imports), then run `bun scripts/sync-ui.ts [--from <path to packages/ui>]`. The script refuses a source tree with uncommitted changes and a name the package does not have.
- The app imports these files as `@continuum/ui/components/<name>`, `@continuum/ui/hooks/<name>` and `@continuum/ui/styles/theme.css`, aliased to `vendor/ui/` in `tsconfig.json` and `astro.config.mjs`. `cn` comes from shadcn's npm package `cn`, as in Continuum.
- Only the reader's own composites (Explorer, Rows, and later Matrix, Diagram, Meter, Pager) live in `src/components`, built from these primitives and the theme's tokens.
