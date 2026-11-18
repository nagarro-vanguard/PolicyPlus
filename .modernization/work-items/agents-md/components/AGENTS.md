# Components: the shadcn on Base UI components, Tailwind theme and lucide icons, documented in Storybook

Stack: screens: TanStack Start, server rendered, with React 19, TanStack Router, Query and Form, Tailwind 4, shadcn on Base UI with Storybook for the components, lucide icons, Paraglide for the messages.

- Components are presentational, styled with Tailwind tokens, built on Base UI for behaviour and accessibility, each with a Storybook story; no data fetching or routing.

## Verify

- `bun run typecheck && bun run test && bun run storybook:build`
