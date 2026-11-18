# UI components: the shadcn on Base UI components, Tailwind 4 styles and lucide icons, shown in Storybook

Stack: screens: TanStack Start, server rendered, with React 19, TanStack Router, Query and Form, Tailwind 4, shadcn on Base UI with Storybook for the components, lucide icons, Paraglide for the messages, Playwright for e2e tests.

- Components take data and callbacks only, never call the API or router; each has a Storybook story covering its states, with an axe check.
- Use Tailwind 4 design tokens and the shadcn on Base UI primitives; do not add colors, spacing or icon sets outside them.

## Verify

- `bunx tsc --noEmit && bunx vitest run --passWithNoTests && bunx storybook build --test`
