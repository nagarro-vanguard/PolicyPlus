# Review checklist: The Map

Every flow is followed along these records, from an entry point until another entry point or an external system ends it; a finding that is false, or missing, moves or ends a flow. A block claims its whole lines, from its declaration to its end, and its code kind; a link claims both its ends, so a challenge to one cites a line of each; an entry point claims its purpose and title; a data definition claims each field as declared.

An entry point is where control or data enters the system's code from something that is not that code's own flow: a host, framework, scheduler, runtime or another process calls it, including a handler a person triggers. The test is who starts it and whether we hold the starter's source: code we hold that starts it makes it a step of that code's flow, and a starter we do not hold makes it an entry point.

## Wrong

- An entry point on code the system's own code starts (for example a procedure the application runs, a handler it calls): it cuts that code's flow short.
- A block given a code kind whose `membershipRule` its lines do not meet, or one another code kind's `membershipRule` admits as well; a new code kind where an entry of the registry does fit, or one named as an entry is; a block whose name is not on its declaration line; a container listed as a block; two blocks sharing their lines, or overlapping without one holding the other.
- A link whose target does not answer the reaching by the brief's rules, of the wrong kind, whose lines start outside the job, or sent from a shared helper to every target it could reach where the call site that decides the target is in the job's lines; a save sent to the wrong external system, or a new external system where an entry of the registry fits; a link from a list of files to build or package (a project or solution file naming its sources), which says what is compiled, not where work goes.
- A link to an external system for a name the code uses to start work elsewhere (a command name, a topic, an address) when a definition of that name is in scope: it names a line inside each such definition (a file `find-files-in-scope.ts` does not list is not in scope).
- A link of kind `call`, `reads` or `saves` that starts inside a `DataDefinition`: a shape holds no behaviour, so lines that name where work goes are a block (navigation links from data are the exception).
- A `dispatches` link written at a call site, pointing from a block that is not the stand-in, or guessed where the code does not show the stand-in; an interface or abstract member written as a container, so that no link can reach it.
- A `unresolvedTarget` where a search of the code settles the target.
- An entry point's `purpose` or `reachedBy` its lines do not show, or written with ids or internal terms (for example block, link, entry point) a reader would not follow.
- A screen layout whose controls are not the fields of one `DataDefinition` named for the screen (the `container` of its handlers), a control missing from it, or a caption or limit not as the layout sets it.
- A `DataDefinition` whose lines do not declare one shape, a field not declared as written, a `declares` its lines do not name.
- `fieldsUsed` its own lines do not name (for example a service's members, variables or parameters).

## Missing

- A block that overrides or implements a member, with its declaration in the job's lines, and no `dispatches` link to that member; a member declared without a body and called from the job's lines, with no block.
- A block, or a place where work leaves the job's lines, with no link; a target decided at run time reached from the job's lines with no link, what a mapping run misses most (for example implementations, listeners, registrations and configuration that name code reached from these lines).
- An entry point the brief's rules admit, a shape of data in any layer, a call into code with no source in scope, or a navigation or permission rule, starting in the job's lines with no record.
- A `Span` named as comments, imports or configuration over lines that hold code that runs: a missed block.
