## Commands
- check: `/Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/scripts/explain-capability-rules.ts check job-4673454851309298`
- carry: `/Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/scripts/explain-capability-rules.ts carry job-4673454851309298`

## Rules
# Writing business rules

- Every decision a block makes is one `BusinessRule`, written as `describe-shape.ts BusinessRule` says, owned by the block whose lines decide it; `gates` where it allows or refuses a transition of the accepted lives. A check written twice in the code (on a screen and on a server) is two rules.
- Copies of one file kept in several folders sit side by side in your job: write each copy's rules in the same words where they decide the same thing, and say where a copy differs.
- A block that decides nothing gets no record: read all of its lines, write nothing for it, and list what you read in your one `Receipt`, written last. The reviewer hunts missed rules inside every block, so a block you skim costs a rule.
- A rule you find wrong or doubled is removed with `drop-record`, never by editing the output file; correct one you keep by appending it again with its id.
- What the code cannot settle (a limit read from data out of scope, a call to code with no source), where a different answer would change what a person decides from, is an assumed `Fact` about the capability, `aspect` `rules-it-applies`: why, what would confirm it (`material`, `runningSystem` or `decision`), what changes if it is wrong, and the nearest lines.
- Follow the data through each block: its code kind, layer, the capabilities and entry points it serves, where its work leaves it; read beyond it wherever a value, a message or an outcome is decided elsewhere.
- A transition whose `writtenAt` lies in your block is one its rules may gate: search the accepted lives by your blocks' files.
- Read each rule as a tester would: could they check it from your words alone? Re-read each text as someone who has never seen the code and must decide with it.

## Read besides
- the accepted lives, one JSON record per line: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/lifecycles.jsonl
- what earlier stages established: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/brief.json
