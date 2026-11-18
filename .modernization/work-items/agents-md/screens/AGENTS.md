# Screens: the server rendered TanStack Start screens, routes, queries, forms and Paraglide messages

Stack: screens: TanStack Start, server rendered, with React 19, TanStack Router, Query and Form, Tailwind 4, shadcn on Base UI with Storybook for the components, lucide icons, Paraglide for the messages.

- Server data goes through TanStack Query and route loaders; forms use TanStack Form with Effect Schema validation; every visible string is a Paraglide message.
- Screens call the API through a client generated from the contract and never import Data or Domain parsers.

## Verify

- `bun run typecheck && bun run test && bun run build`
