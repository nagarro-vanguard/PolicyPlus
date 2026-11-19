# Places: scheduled tasks

Given to the briefing agent when the code suggests tasks (`task`): work a timer or a job scheduler starts.

## Detection signals

- A candidate of kind `task`; entry points started by a schedule; a timer, an executor, a cron entry, or a program whose main routine names a task.

## What counts as a place

- One task is one place; one run of it is one action. How often it runs is a fact, not a place.
- A task a person can also start by hand has two entry points with different starters, in the same place.

## How to choose the kind

- `task` even when the timer runs inside the web process: what starts the work decides, not where it runs.

## Nouns

- `scheduled task` / `scheduled tasks` from the catalogue. Name a task for what it gets done ("Ping weblog sites each night").

## Words to avoid

- Executor, cron expression, thread, job class, runnable.

## Known traps

- A timer inside the web application whose tasks the Map recorded as started by a person: the kind is still `task`; say so in the purpose.
- The scheduler's own loop is not a place; the tasks it runs are.
