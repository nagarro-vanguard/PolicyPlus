---
name: fetch-work-item
description: Fetches one work item from its tracker, with every field and linked item as the tracker holds them, and writes it as work-item.md, so the plan starts from the tracker's own words.
---

# Fetch Work Item

## Arguments

- `workItemUrl` (required)
- `outputPath` (required)
- `customInstructions` (optional)

## Work

Fetch the item and its links with the tracker's tools. Write `outputPath` with the title as its `#` heading, then one `## <Field>` section per field the tracker holds, in the tracker's words: type, description, acceptance criteria and the rest. Omit empty fields. List each linked item as id, type, title. Add no analysis. If the tracker cannot be reached, write nothing and say why.
