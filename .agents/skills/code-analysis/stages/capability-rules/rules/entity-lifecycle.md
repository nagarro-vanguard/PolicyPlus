# Writing an entity's life

- One `Lifecycle`: the fields holding its state, and every state the code writes or tests, named as its users would say it, with how the code writes it; or, for an entity no record of which changes state, why.
- One `Transition` per place that moves a record from one state to another or creates it in one, at the lines that write it. Both errors cost: a state invented from one value (a typo, a test record) and a state or a change missed mislead every rule attached to the life.
- A save that changes no state gets no record: read its lines and list them in your one `Receipt`, written last. A transition you find wrong is removed with `drop-record`, never by editing the output file.
- Read before you assume: search the saves, the data definitions and the code near them for where each state is set. Only what no file in scope settles (a state set only in data or configuration out of scope) is an assumed `Fact` about the entity, `aspect` `life-of-states`, as `describe-shape Fact` says.
- Code no entry point reaches may still run (a trigger, a listener, a job the platform starts): read whether anything starts it before you say a save is never made.
- Read every save in the uses file, those with no fields recorded included: `check` weighs only your receipt's coverage of them. Test each state against saves you did not write it from.
- Re-read each text as someone who has never seen the code and must decide with it.
- **Risk findings:** where a state can be reached without the check its transition needs, a state is skipped, or data is left inconsistent when a step fails, write a `Fact` with aspect `anything-else`, the capability as subject, a `risk` (category and severity from the catalogue), an observed basis and the lines that show it. None where the code shows none.
