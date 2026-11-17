## Commands
- check: `/Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/scripts/name-capabilities-and-entities.ts check job-2504979299516611`
- carry: `/Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/scripts/name-capabilities-and-entities.ts carry job-2504979299516611`

## Rules
# Capabilities and entities: rules

What a capability and an entity are, how wide each is, how their registries grow and are merged, and their records and commands. Every entry point's page is named by its capability and every entity's page lists what keeps it, so an entry too wide, too narrow or named for the code misleads every page that shows it. The proposing, assigning and merging agents and their reviewer apply these rules, for any stack and any medium.

## Records and commands

- The capabilities' entries are `Capability` records; the entities' are `Entity` records.
- An assigning job's units are an `AssignEntryPointsJob`, an `AssignResourcesJob` or an `AssignShapesJob`; a job merging duplicates holds its slice of written entries, a `MergeCapabilitiesJob` or a `MergeEntitiesJob`.
- An entry point is assigned by a `EntryPointAssignment`, a resource by a `ResourceAssignment`, a data shape by a `ShapeAssignment`. A resource's assignment cites lines of its declarations or uses; an entry point's or data shape's cites none, its own lines are its evidence.
- `briefPath` holds the layers, the external systems by record id, and the facts whose questions the stage reads: among them what the system is for and who uses it, and where navigation and permissions are declared (a menu, a route table, a transaction list). Read the navigation they point to: its headings are evidence of what the business offers. A merging job's `briefPath` instead lists every entry with the parts it lies in and its first twelve members and how many more it has (`MergeCandidate`).
- `<scriptsCommand>/name-capabilities-and-entities.ts uses <externalSystem> <resource>` prints a resource's uses.

## What the code cannot settle

- What the code cannot settle about an entry or a unit, where a different answer would change a page a person decides from, is an assumed `Fact`: about the capability or entity (`what-it-does` or `what-it-holds`), or about the part holding the unit; why no file settles it, what would confirm it (`material`, `runningSystem` or `decision`), what changes if it is wrong, and the nearest lines. Never a question to the person.

## The registry

- Each kind has one registry: the capabilities, or the entities. It grows as the assigning jobs write: the first job of the registry runs alone, and every later job chooses from what is written and writes the entry it needs where none fits.
- An assigning job takes the entry whose `membershipRule` a unit meets. Where none does, it writes the entry the unit needs, at the width below, and assigns the unit to it; the next jobs read it. An entry is never withdrawn once written.
- Duplicates are expected: jobs running at once write the same entry twice. Once every unit is assigned, merging jobs each take a slice of the written entries and merge each one that means what another entry means, by naming it in that entry's `mergedFrom`. A merging job changes the words only of the entries of its slice; an entry outside it is written exactly as the registry holds it, with only the merges added. Only a written entry is merged, never a seeded one, and each once.

## Capabilities

- A capability is an area of the business carried out from start to finish, owned and changed as a whole. The test: would the business change its rules, and talk about it, as one thing?
- Entry points on the same data under the same rules belong together, whoever starts them (a person, a schedule, another system) and wherever their code lies.
- A report or an export goes with the data it serves, not apart from it.
- A menu heading, a role, a controller or a program name is evidence, never the name: name it as its users would say it.
- Signing in, what a person first sees and the product's own pages and checks are one capability: using the product.
- A dispatcher's handlers are the entry points; the dispatcher is not a capability.
- When unsure between a narrower and a wider capability, take the wider.
- For example: a web screen and its API calls that manage orders; a mainframe transaction updating policies with the batch job renewing them; a message consumer posting payments with the screen correcting them; a file feed loading prices with the page publishing them.
- Too wide: a catch-all ("Administration", "General") holding areas the business changes apart. Too narrow: one per controller, menu item, verb or entry point, when they serve one area.

## Entities

- An entity is a business thing with its own identity. The test: does the business create, change or refer to one by itself?
- Records living only inside another (an order's lines, a policy's riders) belong to it. Code lists and link tables belong to the entity whose rules govern them.
- Ledgers and audit trails are entities: a record of what happened is not the thing it happened to. Technical logs, caches, queues of work and error records keep no kind of data the business knows: answer `notBusinessDataReason`, with why.
- One meaning kept in several places (a table and its archive, the same data in two stores, a record and the message carrying it) is one entity.
- A resource that reads or changes records kept elsewhere (a view, a stored routine, a query or endpoint over another store) belongs to the entity whose records it serves: it is a way to that data, and `notBusinessDataReason` would cut what reaches the data through it. Only one serving no business records (the store's own catalogue, a tool's mapping, a temporary table) keeps no data.
- Name it for what one record means, in the business's words; a table, collection, file, segment or class name is evidence, not the name.
- A data shape declaring no resource (what a person sees and enters, a request, a message, a domain class) belongs to the entity it shapes in its layer.
- For example: a customer kept in a database table, a mainframe file and a partner's message; a policy and its riders; a payment and its ledger entries.
- Too narrow: one entity per table, child or lookup, or one per spelling of a table's name.

## Read besides
- what earlier stages established: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capabilities-and-entities/brief.json
