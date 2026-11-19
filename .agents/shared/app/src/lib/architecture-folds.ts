import { plural } from "./text";

// What each fold's heading says it holds, as one short count.
export const analysisCopy = {
    summaries: (n: { people: number; outside: number; parts: number; containers: number; components: number; domains: number; kinds: number; risks: number; alternatives: number }) => ({
        containers: n.containers > 0 ? plural(n.containers, "container") : plural(n.parts, "part"),
        connections: plural(n.outside, "outside system"),
        components: plural(n.domains, "domain"),
        data: plural(n.kinds, "kind"),
        risks: String(n.risks),
        alternatives: String(n.alternatives),
    }),
};
