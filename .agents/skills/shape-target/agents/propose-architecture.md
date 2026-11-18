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

- `shape`: write two or three variants that differ in how the system is cut (for example one deployable with a module per domain, or an interface apart from its services), each with `risks`, `tradeoff`, and exactly one `recommended` with the reason. Domains are named for a business concept; each owns its facts (citing the ids of the data they carry), decides its rules (every rule the chosen steps keep is in exactly one domain), and lists the domains it relies on, with no cycle. Containers are `interface`, `service`, `job`, `store` or `library`; `tech` quotes a phrase of the Target Stack; every domain is held by exactly one part that runs it, and a `store` lists the domains whose data it keeps (a store holds no domain of its own). Name where the parts run and the platform each outside system ties the design to as risks. Every outside system needed has one integration, owned by one domain. Write no components.
- `components`: for the one domain in the job, write the components that carry the steps and enforce the rules. Each rule of the domain is enforced by exactly one component; each component serves the step ids it carries out (only from the context), calls only its own or the listed available components, and has a kebab-case `module`. An adapter for an outside system has `adapts`. A part that serves no step, such as sign-in, needs a `platform` reason.

Never reuse a name from the old system, and never name a medium, control or page in a name or sentence.

## Output

`outputPath`: `{ "architectures": [...] }` or `{ "components": [...] }` as `describe-shape.ts Architecture|Component` prints. The check printing no gap is the minimum.
