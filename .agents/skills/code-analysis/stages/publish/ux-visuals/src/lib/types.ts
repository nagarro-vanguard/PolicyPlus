import type { z } from "zod";
import type { capabilitySchema } from "../generated/capability";
import type { knowledgeSchema } from "../generated/knowledge";
import type { systemSchema } from "../generated/system";

export type System = z.infer<typeof systemSchema>;
export type Capability = z.infer<typeof capabilitySchema>;
export type Layer = Capability["layers"][number];
export type Action = Layer["actions"][number];
export type Rule = Layer["rules"][number];
export type Screen = System["screens"][number];
export type Knowledge = z.infer<typeof knowledgeSchema>;
export type Risk = Knowledge["risks"][number];
export type Part = Knowledge["parts"][number];
export type Lifecycle = Knowledge["lifecycles"][number];
export type FigureBrief = Knowledge["figures"][number];
