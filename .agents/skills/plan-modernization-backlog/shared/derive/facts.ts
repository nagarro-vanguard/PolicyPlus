import type { Analysis } from "../read/analysis";

export type Place = { readonly file: string; readonly firstLine: number; readonly lastLine: number };

export type ActionFact = {
    readonly id: string;
    readonly name: string;
    readonly purpose: string;
    readonly startedBy: string;
    readonly place: Place;
    readonly rules: readonly string[];
    readonly surface: string;
};

export type RuleFact = {
    readonly id: string;
    readonly says: string;
    readonly place: Place;
    readonly alsoRestsOn: readonly Place[];
    readonly reach: readonly string[];
    readonly doubt: string;
    readonly gates: string;
};

export type Surface = {
    readonly key: string;
    readonly capability: string;
    readonly name: string;
    readonly actions: readonly ActionFact[];
    /** Rules this surface builds: reached by one carried capability and first reached here, in the plan's order. */
    readonly owned: readonly string[];
    /** Rules it reaches that another surface or a shared story builds, with who builds them. */
    readonly relies: readonly { readonly rule: string; readonly owner: string }[];
};

export type CapabilityFact = {
    readonly id: string;
    readonly name: string;
    readonly purpose: string;
    readonly size: number;
    readonly surfaces: readonly Surface[];
    readonly data: readonly {
        readonly id: string;
        readonly name: string;
        readonly access: string;
        readonly stores: readonly string[];
    }[];
};

export type Facts = {
    readonly fingerprint: string;
    readonly purpose: string;
    /** In the plan's pre-order: smallest first, so the pilot comes first. */
    readonly capabilities: readonly CapabilityFact[];
    readonly rules: ReadonlyMap<string, RuleFact>;
    readonly shared: readonly string[];
    readonly externals: readonly { readonly id: string; readonly name: string; readonly kind: string }[];
    readonly transitions: readonly {
        readonly id: string;
        readonly entity: string;
        readonly entityName: string;
        readonly from: string;
        readonly to: string;
        readonly place: Place;
        /** The surface key, or `shared`, that builds the rule which gates this change of state; empty when no rule gates it. */
        readonly owner: string;
    }[];
    readonly unreached: readonly { readonly what: string; readonly place: Place }[];
    readonly carried: ReadonlySet<string>;
};

export const SHARED = "shared";

/** The name a surface is shown under; entry points no container holds share one. */
export const surfaceName = (screen: string) => (screen === "" ? "Entry points without a window" : screen);

/**
 * Derives what the plan needs of the analysis, for the capabilities that are carried: the plan's pre-order of surfaces,
 * which surface or shared story builds each rule, and what each surface relies on. Pure.
 * @param analysis the analysis's payloads
 * @param carried the capability ids to plan; all by default
 * @returns the facts
 */
export const deriveFacts = (analysis: Analysis, carried?: ReadonlySet<string>): Facts => {
    const all = new Set(analysis.capabilities.map((each) => each.capability.id));
    const keep = carried ?? all;
    const bundleRule = new Map(analysis.bundle.rules.map((rule) => [rule.id, rule]));
    const rules = new Map<string, RuleFact>();
    for (const payload of analysis.capabilities) {
        for (const layer of payload.layers) {
            for (const rule of layer.rules) {
                if (rules.has(rule.id)) continue;
                const info = bundleRule.get(rule.id);
                rules.set(rule.id, {
                    id: rule.id,
                    says: rule.says,
                    place: rule.place,
                    alsoRestsOn: rule.alsoRestsOn,
                    reach: (info?.capabilities ?? []).filter((id) => keep.has(id)),
                    doubt: info?.reading === "disputed" ? info.why : "",
                    gates: info?.gates ?? "",
                });
            }
        }
    }
    const sizeOf = (payload: Analysis["capabilities"][number]) =>
        payload.layers.reduce((sum, layer) => sum + layer.actions.length, 0);
    const ordered = analysis.capabilities
        .filter((payload) => keep.has(payload.capability.id))
        .sort((a, b) => sizeOf(a) - sizeOf(b) || a.capability.name.localeCompare(b.capability.name));
    const draft = ordered.map((payload) => {
        const actions: ActionFact[] = payload.layers.flatMap((layer) =>
            layer.actions.map((action) => ({
                id: action.id,
                name: action.name,
                purpose: action.purpose,
                startedBy: action.startedBy,
                place: action.place,
                rules: action.rules,
                surface: surfaceName(action.screen),
            })),
        );
        const names = [...new Set(actions.map((action) => action.surface))].sort((a, b) => a.localeCompare(b));
        return { payload, actions, names };
    });
    // The first surface, in the plan's order, that reaches a rule builds it, unless several capabilities reach it.
    const ownerOf = new Map<string, string>();
    for (const { payload, actions, names } of draft) {
        for (const name of names) {
            const key = `${payload.capability.id}/${name}`;
            for (const action of actions.filter((each) => each.surface === name)) {
                for (const rule of action.rules) {
                    const fact = rules.get(rule);
                    if (fact === undefined || ownerOf.has(rule)) continue;
                    ownerOf.set(rule, fact.reach.length > 1 ? SHARED : key);
                }
            }
        }
    }
    const capabilities: CapabilityFact[] = draft.map(({ payload, actions, names }) => ({
        id: payload.capability.id,
        name: payload.capability.name,
        purpose: payload.capability.purpose,
        size: actions.length,
        data: payload.data.map((each) => ({ id: each.id, name: each.name, access: each.access, stores: each.stores })),
        surfaces: names.map((name) => {
            const key = `${payload.capability.id}/${name}`;
            const mine = actions.filter((action) => action.surface === name);
            const reached = [...new Set(mine.flatMap((action) => action.rules))].filter((rule) => rules.has(rule));
            return {
                key,
                capability: payload.capability.id,
                name,
                actions: mine,
                owned: reached.filter((rule) => ownerOf.get(rule) === key),
                relies: reached
                    .filter((rule) => ownerOf.get(rule) !== key)
                    .map((rule) => ({ rule, owner: ownerOf.get(rule) ?? SHARED })),
            };
        }),
    }));
    const entityIds = new Set(capabilities.flatMap((capability) => capability.data.map((each) => each.id)));
    return {
        fingerprint: analysis.fingerprint,
        purpose: analysis.system.purpose,
        capabilities,
        rules,
        shared: [...ownerOf.entries()].filter(([, owner]) => owner === SHARED).map(([rule]) => rule),
        externals: analysis.system.externals,
        transitions: analysis.bundle.lifecycles
            .filter((life) => entityIds.has(life.entity.id))
            .flatMap((life) =>
                life.transitions.map((transition) => ({
                    id: transition.id,
                    entity: life.entity.id,
                    entityName: life.entity.name,
                    from: transition.from.map((n) => life.states[n - 1] ?? "").join(" or ") || "created",
                    to: life.states[transition.to - 1] ?? "",
                    place: { file: transition.file, firstLine: transition.firstLine, lastLine: transition.lastLine },
                    owner: (() => {
                        const gate = analysis.bundle.rules.find((rule) => rule.gates === transition.id);
                        return gate === undefined ? "" : (ownerOf.get(gate.id) ?? "");
                    })(),
                })),
            ),
        unreached: analysis.bundle.unreached.map((each) => ({
            what: each.what,
            place: { file: each.file, firstLine: each.firstLine, lastLine: each.lastLine },
        })),
        carried: keep,
    };
};
