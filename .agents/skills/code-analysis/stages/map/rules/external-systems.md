# External systems: rules

What an external system is, how wide one is, how the registry grows, and its records. Every link that leaves the code names one, so one system written twice, or two systems lumped into one, blurs where each flow ends and what the system depends on. The proposing agent, the Map's agents and their reviewer apply these rules, for any stack and any medium.

## Records and commands

- Entries are `ExternalSystem` records.
- The registry grows as the Map's jobs write: the lead job, which holds the most kinds of file and parts, runs first and alone, and every later job chooses from what is written and writes the entry it needs where none fits. You merge duplicates once every Map job is decided: `jobPath` is every entry written, beside the registry so far. `briefPath` holds the parts, each with its kind, the technologies, and How it runs' facts on each technology.
- The Map's own jobs assign: every link that leaves the code names one external system, of the registry or written by the job (see below), or a part's code (a block); a new address of a known system is a link to that system, never a second entry.

## An external system

- Something the code reaches while the system runs, beyond its own code: a data store (a database, a set of files), a message queue, a payment, email or sign-in service, another organisation's system, or code with no source here (a compiled library, a package, a load module) whose work the system relies on. Its kind is a data store, messaging, an external service, or a library.
- A library is an entry only when its source is not in scope (`find-files-in-scope.ts` answers). A call into it is a link of kind `call` naming the library and the operation called as its resource (`Orders.Save`), never a guess at the data it changes: what it does there is unknown, and pages say the flow continues in code not analysed. An operation is never data: no kind of data is ever assigned to it.
- A build or deploy target (a staging folder, a packaging feed, a developer's server) is never an entry: no flow of the running system reaches it.
- A file-system operation's resource is the folder, share or bucket it acts on, never the operation's name.
- A statement that defines or changes a data shape (DDL, a migration, a schema file, a model mapping) is a data definition, never a save or a read: changing a shape writes no data. A statement in the same file that writes rows is a save.
- A data store is an entry whether or not its schema is in scope: the code reaches it through a connection while it runs. Its schema in scope is data definitions, each declaring the resource it shapes there (`declares`); a link saving or reading data names the store and the resource as the code names it. What a link names in a store is data (a table, a collection, a queue, a file). Code that runs in or behind the store, a unit the store runs by name whose source is in scope, is a part, never the store: a link that starts it names a line inside it (next rule). A name is a resource's identity only where nothing in scope defines it.
- A service whose code is in scope is a part, never an entry: a link to it names the block it reaches.
- One system, one entry, however many ways the code reaches it: every address, settings key and client type it is reached by goes in its `membershipRule`.
- One address serving two systems (two products of one vendor behind one domain) is two entries, told apart in `membershipRule` by what the code asks of each.
- Named for what it is to the business ("the card payment service"), with the product's name where the code shows it.
- What the code cannot show about it (which environment, which account) is an assumption concerning the entry.

## What the code cannot settle

- What the code cannot settle about an entry (which environment, which account) is an assumed `Fact` about the part holding the lines (or the system), its `aspect` `external-systems`, as `describe-shape Fact` says. A choice of how to file something is never a fact. Never a question to the person.

## How the registry grows

- Grown by the Map's jobs from the lead job on, then merged once every Map job is decided, reviewed before it is written. Never frozen.
- A Map job whose link no entry fits writes the external system it needs, never a name an entry already has; each closed batch adds it to the registry the next batch reads.
- Once every Map job is decided, this job runs once more with the external systems Map jobs wrote: merge each duplicate, of yours or of another written one, into the entry that stands for both, naming it in that entry's `mergedFrom` and widening its `membershipRule`; keep the rest as written. Nothing is dropped.
