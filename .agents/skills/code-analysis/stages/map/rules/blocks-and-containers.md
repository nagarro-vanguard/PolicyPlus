# Blocks and Containers

A block is a piece of code that runs when invoked, or a member declared without a body that other code calls and others stand in for (an interface member, an abstract member, a protocol requirement): such a member is a block of its own, so that a call to it reaches a block and a `dispatches` link can point at it (see below). A container only groups or declares. Every line of a file belongs to exactly one innermost block; lines outside any block form the file's own block.

What a block and a container are in each framework is How it runs' fact on it, given in the brief: follow it.

## Lines and links

A block starts where its declaration starts, including annotations, attributes and decorators directly above it, but not comments, and ends on its last line. A link names its target by any line inside the block it reaches, and the Map's checks join each link to the innermost block holding that line, so a link naming a line inside a block still reaches that block, and one naming a line that runs nothing (a comment, a closing brace) is kept as a call into lines that run nothing, never a gap sent back to a job. Only a line where two blocks start is a gap, sent back to both.

## Code that can run in place of other code

Where the code shows that one block can run in place of another, chosen at run time by the type or value of something, the block that can stand in has one `dispatches` link, written at the lines that show it (a method that overrides, a member that implements an interface or protocol member, a handler or listener registered for a member, a binding of an implementation to an interface) and pointing at any line inside the member it stands in for. Never write it at the call site: a call names the member; each stand-in names itself. A flow that reaches the member goes on into each such block, and a page shows it as possible, not certain.

- The same in any stack: an override of a base class member, a class's implementation of an interface member, a protocol conformance, a registered callback or listener, an injected implementation behind an interface, a trait or type-class instance.
- Only where the code shows the stand-in. A call whose target is chosen by a value the code does not show (a name read from data, a variable holding an address) stays an `unresolvedTarget`, never a guessed `dispatches`.
- A member the runtime or a framework calls on every value (text conversion, equality, hashing, accessors) is not given a `dispatches` link to library code with no source in scope; it stays a block no flow reaches, which the analysis reports as code no followed call reaches.

## Shapes of data

A shape of data in the code (a settings file, a data file, a class holding only fixed values) is a `DataDefinition`, never a block, since nothing in it runs. A link reading or writing it names a line inside that definition, as it would a block's, and the flow ends there, as it does at an external system. A definition may run on past a job's window, as a block may; the job after it leaves those lines to it.

## The layout of a screen

A file that lays out a screen (a designer file, a layout or markup resource, a view definition) holds the controls the screen declares and a routine that builds them: sets each one's type, caption, position, limits and order. The declarations of one screen are one `DataDefinition`, in the layer of what a person sees and enters, whose `writtenAs` is the screen's class or view name as the code that handles the screen writes it, so it equals the `container` of the screen's handlers. Each control is a field: `writtenAs` its name, `declaredAs` its type, its caption or label text exactly as the layout sets it, and the limits it sets (maximum length, read-only, enabled, order of focus). The routine that builds the controls is a block of a code kind for generated screen layout, a step of the screen's own constructor or loader, never an entry point.

- What the layout does not hold is mapped where it is: the handlers of a screen's events and what it checks are in the code that handles the screen, in any stack, and are blocks there.
- Controls that carry no text and no limit (a spacer, a container panel) are still fields, so every control the screen declares is one field of its definition.
- A layout file holding only generated lines that declare and set nothing a person can see, enter or tell apart is a `Span`.

## Event handlers

A handler registered, in the code of what a person sees and enters, to run on one of its events is a block, with no name when the code gives it none. Registering it is a `call` link.

## Code brought in or chosen at build time

- An included file (for example a header or a copybook) keeps its own blocks; the include line is a `call` link from the including block, so flows go on into it.
- Code inside a build condition belongs to the block it sits in; a fact that holds only under the condition says so.
- A macro expanded at build time is described where it is used.

## The file's own block

Top-level statements, declarations, markup and anything outside a named block. It is written as a block only when it has lines of its own that run (for example top-level statements, markup); a file holding only containers and their blocks has none. A template is written as one block named after its file, from line 1 to its last line, and can be an entryPoint.
