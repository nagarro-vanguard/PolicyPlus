export const slug = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

/** A journey's id: its task and the slug of its name, which is unique within the task. */
export const journeyId = (task: string, name: string) => `${task}:${slug(name)}`;
/** A step's id: its journey's id and its 1-based position. */
export const stepId = (journey: string, position: number) => `${journey}#${position}`;
