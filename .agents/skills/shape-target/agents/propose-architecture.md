---
name: propose-architecture
description: Designs two or three architectures from the chosen journeys, the rules and the target stack, split into domains, and later the components of one domain of the chosen one.
---

# Propose Architecture

Goal: a system built around the business, not around the old one: domains that own their data and rules, parts that run them, and components that carry each step. You never see the old system's structure and you do not copy its names.
Tools: `<scriptsCommand> check <jobId>`, `bun <this skill's folder>/cli/describe-shape.ts Architecture|Component`, Read, Write.

## Arguments

- `scriptsCommand`, `jobId`, `jobPath` (the job's inputs; `kind` says which), `contextPath`, `outputPath` (required).
- `customInstructions` (optional, last): feedback on your last output; keep what stands.

## Work

Read both files.

- `shape`: write two or three variants that differ in how the system is cut and where its parts and data live, whatever the Target Stack and the request say about hosting and deployment: variants that differ only in names are not alternatives. Each has `risks` (plain sentences: say what limits the damage where something does, and name the platform each outside system ties the design to), a `tradeoff` (one sentence on a cost the others do not share) and exactly one has `recommended` with the reason. Domains are named for a business concept; each owns its facts (citing the ids of the data they carry), decides its rules (every rule the chosen steps keep is in exactly one domain) and lists the domains it relies on, with no cycle and none missing for the data its steps touch. Containers are `interface`, `service`, `job`, `store` or `library`; `tech` quotes a phrase of the Target Stack; every domain is held by exactly one part that runs it, and a `store` lists the domains whose data it keeps. Every outside system needed has one integration, owned by one domain. Write three `views` for each variant: functional (a box for every domain and how the work divides among them), technical (a box for every container and how they work together) and deployment (a box for every container, where it runs and what it needs there, in the words of the request); box names are at most 6 words, arrow labels 4 and notes 40. Write no components.
- `components`: for the one domain in the job, write the components that carry the steps and enforce the rules. Each rule of the domain is enforced by exactly one component, as its `to` says when it has one; each component serves the step ids it carries out (only from the context), calls only its own or the listed available components, and has a kebab-case `module`. An adapter for an outside system has `adapts`. A part that serves no step, such as sign-in, needs a `platform` reason. Each component has one `kind`: `rules` (decides rules), `adapter` (the one with `adapts`, and only it), `data` (keeps and reads the domain's data), `flow` (carries a step through, calling the others) or `interface` (where a person or another system takes part in a step; it serves at least one). Also write one technical `view` of this domain's components (a box may stand for several; cite component names and step ids).

Never reuse a name from the old system. Write plainly: no superlatives and no count of steps.

## Output

`outputPath`: `{ "architectures": [...] }` or `{ "components": [...], "view": {...} }` as `describe-shape.ts Architecture|Component|View` prints. The check printing no gap is the minimum.
