# Web app: the TanStack Start screens, routes, Query and Form wiring and Paraglide messages

Stack: screens: TanStack Start, server rendered, with React 19, TanStack Router, Query and Form, Tailwind 4, shadcn on Base UI with Storybook for the components, lucide icons, Paraglide for the messages, Playwright for e2e tests.

- Fetch through TanStack Query using a client generated from the contract; no hand-written fetch calls or duplicated response types.
- Every visible string is a Paraglide message; no literals in components, and policy text from definitions is shown as data, not translated.
- Forms use TanStack Form with the contract schema as the validator, so client and server reject the same input.
- Server rendering must not touch the machine: only the API reads disk or registry, and route loaders call it over HTTP.

## Verify

- `bunx tsc --noEmit && bunx vitest run --passWithNoTests`
