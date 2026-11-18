# Plan diagrams

A diagram is one `PlanView` record, drawn where a decision needs the whole design seen at once: a new part, a changed relation or boundary, a state that moves. A one-line fix, a rename and a change inside one part need none. Draw one per question the reader must decide. A plan that owed one and has none says why in its hand-back.

- Show the design the story describes, not the code: its actors, what it keeps and the states, its rules, where it meets the outside and the journeys it changes, all from the orientation and the trace. Include every fact that bears on the question, or say in the hand-back why one is left off.
- Choose the shape by the question: relations, order between actors, kept data, states, or a trust or deployment boundary. Mark what is new, changed or removed.
- Write plain Mermaid text (flowchart, state, sequence, class, entity-relationship or chart). The renderer refuses empty text or an unknown diagram and stops the plan; read the picture for other slips.
- Use the reader's words: an approver's diagram has the product's words and no file, route, table or code name; an engineer's may use the code's.
- Keep labels short and nodes few.
- `about` names the criteria, steps or decisions the diagram explains.
