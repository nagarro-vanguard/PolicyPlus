# Review checklist: The Map's registries

Every Map job places each piece of code by one code kind and each link out by one external system, choosing only from these registries; only this review sees a whole registry. An entry claims every piece its `membershipRule` admits, across every part and language; an external system claims every place that reaches it. Judge each against the entries written in `jobPath`, the rules in `rulesPath` and the facts in `briefPath`: place units from every kind of file in every part by the registry alone, as a Map job would.

## Wrong

- An entry point the system's own code starts (for example a procedure the application runs, a handler it calls): it cuts that code's flow short.
- One external system written twice (for example one gateway two programs reach at one address), or several lumped into one; one address serving two systems written as one; a service whose code is in scope written as an external system instead of a part; a data store the code saves to or reads with no entry, because its schema is in scope; a `reachedThrough` naming code whose source is in scope.
- One code kind split by where it lives or by the language it is written in; two whose `membershipRule` admit the same piece; one named by the code's own marker instead of what it does; one its cited lines are not.
- A code kind in a layer it is not; a layer no code kind sits in.
- In the merge, once every Map job is decided: a written entry merged into one that is not the same thing, or a duplicate left as written.

## Missing

- A code kind or external system a piece in `jobPath` needs, with no entry.
- A way of reaching an external system `jobPath` shows (an address, a settings key, a client) missing from its `membershipRule`.
- A fact in `briefPath` the registry contradicts, left unnamed: the Map would be given two rules.
