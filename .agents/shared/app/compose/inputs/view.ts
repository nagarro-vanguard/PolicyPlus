import { z } from "zod";

/** A view as the model wrote it (code-analysis `shared/views/view.ts`): read loosely, checked by the guard that wrote it. */
export const AuthoredView = z.looseObject({
    viewpoint: z.enum(["functional", "technical", "deployment"]),
    title: z.string(),
    caption: z.string(),
    boxes: z.array(
        z.looseObject({
            id: z.string(),
            label: z.string(),
            note: z.string().optional(),
            group: z.string().optional(),
            cites: z.array(z.string()).optional(),
        }),
    ),
    arrows: z.array(z.looseObject({ from: z.string(), to: z.string(), label: z.string().optional() })),
});
export type AuthoredView = z.output<typeof AuthoredView>;
