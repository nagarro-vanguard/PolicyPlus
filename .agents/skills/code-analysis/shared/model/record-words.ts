import type { ExternalSystem } from "./schemas/external-system";

export const externalSystemKinds = {
    dataStore: "a data store",
    messaging: "a messaging service",
    outsideService: "an external service",
    library: "code with no source here",
} satisfies Record<(typeof ExternalSystem.Type)["kind"], string>;
