import { Layer } from "effect";
import { Git } from "./git";
import { System } from "./system";

/** What the scripts ask of their environment: the world (`System`) and git over it (`Git`). */
export type Services = System | Git;

/** The real services, for an entry point to provide: `System`, and `Git` run through it. */
export const servicesLayer = Git.layer.pipe(Layer.provideMerge(System.layer));
