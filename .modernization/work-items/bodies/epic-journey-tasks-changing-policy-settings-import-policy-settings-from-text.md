# Bring a set of policy settings in from a semantic policy text and apply them to the computer and user policy sources.

## Outcome

The system reads the text as soon as it arrives, shows the count or fault at once, and offers to apply only when the text is good.

## Scope

This epic covers: ImportSpol; Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Bring in with live check: a new journey in this codebase.
- Bring in with live check: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Semantic policy text | new | none: new in this codebase | A plain text script that states, policy by policy, whether each is Enabled, Disabled or Not configured and its settings; it is not a registry file or a policy file. |
| Live check | new | none: new in this codebase | The reading of the text as soon as it arrives, reporting the count of policy settings or the first fault; it is not the apply step and changes nothing. |
| Apply | new | none: new in this codebase | Writing the policies of a checked text into the computer and user policy sources, replacing each policy's earlier settings; it is not the check, which writes nothing. |
