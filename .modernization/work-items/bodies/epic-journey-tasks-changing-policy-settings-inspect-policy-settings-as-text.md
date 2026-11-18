# See policy settings as semantic policy text and copy it out to use elsewhere.

## Outcome

The system gives the text in the form the person will use, ready to take, with the signature line included by default so it can be imported back.

## Scope

This epic covers: InspectSpolFragment.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Ready to take away: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Semantic policy text | new | none: new in this codebase | The plain-text form of a policy's settings that can be copied out and imported back; it is not the policy's on-screen description. |
| Policy text heading | new | none: new in this codebase | The heading line "Policy Plus Semantic Policy" and a blank line at the top of the text that lets it be imported back; it is not part of the policy's settings. |
