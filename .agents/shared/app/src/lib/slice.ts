import { headlineOf, summaryBeyond, summaryOf, titleOf } from "./derive";
import { controlOf } from "./controls";
import { risksOfCapability } from "./risks";
import { epicPath, storyPath } from "./plan";
import type { Plan } from "./plan";
import { slugify } from "./slugs";
import type { Slugs } from "./slugs";
import { compareText, where } from "./text";
import { accessKindWords, gapWords, verdictWords, wordFor } from "./words";
import type { Capability, Knowledge, System } from "./types";
import type { AppIndex, CapBrief, CapSlice, IndexItem, Provenance, SliceAction, SliceRule, SliceScreen, ViewerData } from "./slice-types";
import type { Architecture } from "./target-types";
import type { Gate, GateView } from "./confirmation";

// Builds the two kinds of data file the shell reads (see slice-types.ts). Everything here is a pure function of the
// payloads, so a test can run it on the real ones. Headlines and summaries come from `derive.ts`, never from guessing.

/** Text kept only when it adds something: a summary that is the whole detail would repeat the sentence. */
const extra = (summary: string, detail: string) => (summary === detail ? undefined : summary);

const provenanceOfRule = (): Provenance => "stated";

/**
 * The slice of one capability: everything its pages show, with each rule stored once and referred to by id.
 * @param cap the capability payload
 * @param sys the system payload
 * @param know what the analysis knows of the system as a whole
 * @param slugs the readable addresses
 * @param product the ids of the layers that are the product
 * @returns the slice
 */
export const buildSlice = (
    cap: Capability,
    sys: System,
    know: Knowledge,
    slugs: Slugs,
    product: ReadonlySet<string>,
    journeys: readonly { readonly slug: string; readonly title: string; readonly actions: readonly string[] }[] = [],
): CapSlice => {
    const capId = cap.capability.id;
    const area = sys.areas.find((each) => each.name === cap.area);
    const layerIds = new Map(cap.layers.map((layer, at) => [layer.id, `l${at}`] as const));
    const layerOf = (id: string) => layerIds.get(id) ?? id;
    const screenOfAction = new Map(sys.screens.flatMap((screen) => screen.actionIds.map((id) => [id, screen.key] as const)));

    const ruleIds = new Map<string, string>();
    const rules: SliceRule[] = [];
    for (const layer of cap.layers) {
        for (const rule of layer.rules) {
            if (ruleIds.has(rule.id)) continue;
            const id = `r${rules.length}`;
            ruleIds.set(rule.id, id);
            const detail = rule.says;
            rules.push({
                id,
                headline: headlineOf(detail),
                ...(extra(summaryOf(detail), detail) === undefined ? {} : { summary: summaryOf(detail) }),
                detail,
                gates: rule.gates,
                layer: layerOf(layer.id),
                place: where(rule.place),
                provenance: provenanceOfRule(),
                restsOn: rule.alsoRestsOn.length,
            });
        }
    }

    const actionIds = new Map<string, string>();
    const actions: SliceAction[] = [];
    for (const layer of cap.layers) {
        for (const action of layer.actions) {
            const id = `a${actions.length}`;
            actionIds.set(action.id, id);
            const detail = action.purpose;
            const saves = action.context.saves.length > 0;
            const reads = action.context.reads.length > 0;
            actions.push({
                id,
                headline: headlineOf(detail),
                ...(extra(summaryOf(detail), detail) === undefined ? {} : { summary: summaryOf(detail) }),
                detail,
                startedBy: action.startedBy,
                screen: screenOfAction.get(action.id) ?? "",
                path: action.path.map((step) => layerOf(step.layer)),
                rules: [...new Set(action.rules)].flatMap((rule) => {
                    const mapped = ruleIds.get(rule);
                    return mapped === undefined ? [] : [mapped];
                }),
                place: where(action.place),
                state: saves ? "changes-state" : reads ? "read-only" : "",
                provenance: "stated",
            });
        }
    }
    const actionById = new Map(actions.map((action) => [action.id, action] as const));
    const ruleById = new Map(rules.map((rule) => [rule.id, rule] as const));

    const ownScreens = sys.screens.filter((screen) => screen.capabilities.includes(capId));
    const screens: SliceScreen[] = ownScreens.map((screen) => {
        const mine = screen.actionIds.flatMap((id) => {
            const mapped = actionIds.get(id);
            return mapped === undefined ? [] : [mapped];
        });
        const mineActions = mine.flatMap((id) => {
            const found = actionById.get(id);
            return found === undefined ? [] : [found];
        });
        const reached = [...new Set(mineActions.flatMap((action) => action.rules))];
        const classes = new Set(
            cap.layers.flatMap((layer) => layer.actions.filter((action) => screen.actionIds.includes(action.id)).map((action) => action.screen)),
        );
        const seen = new Set<string>();
        const controls = cap.screens
            .filter((each) => classes.has(each.name))
            .flatMap((each) => each.controls)
            .flatMap((control) => {
                if (seen.has(control.name)) return [];
                seen.add(control.name);
                const readable = controlOf(control.name, control.declaredAs);
                return [[readable.text, readable.kind] as const];
            });
        const layers = cap.layers.flatMap((layer) => {
            const lid = layerOf(layer.id);
            const through = mineActions.filter((action) => action.path.includes(lid));
            const count = new Set(reached.filter((rule) => ruleById.get(rule)?.layer === lid)).size;
            return through.length === 0 && count === 0 ? [] : [{ layer: lid, actions: through.length, rules: count }];
        });
        return {
            key: screen.key,
            name: screen.name,
            summary: screen.purpose,
            files: screen.files,
            actions: mine,
            rules: reached,
            controls,
            layers,
            otherCapabilities: screen.capabilities
                .filter((id) => id !== capId)
                .map((id) => ({ slug: slugs.capability(id), name: sys.capabilities.find((each) => each.id === id)?.name ?? "" })),
        };
    });

    return {
        version: 1,
        slug: slugs.capability(capId),
        name: cap.capability.name,
        purpose: cap.capability.purpose,
        area: area === undefined ? undefined : { slug: slugs.area(area.id), name: area.name },
        totals: { ...cap.totals, screens: screens.length },
        layers: cap.layers.map((layer) => ({
            id: layerOf(layer.id),
            name: layer.name,
            summary: titleOf(layer.purpose),
            ...(extra(summaryOf(layer.purpose), layer.purpose) === undefined ? {} : { detail: layer.purpose }),
            product: product.has(layer.id),
            actions: layer.actions.length,
            rules: layer.rules.length,
            sharedBlocks: layer.sharedBlocks,
            evidence: layer.evidence.map((place) => `${place.file}:${place.firstLine}-${place.lastLine}`),
        })),
        rules,
        actions,
        screens,
        journeys: journeys.flatMap((journey) => {
            const mine = journey.actions.flatMap((id) => actionIds.get(id) ?? []);
            return mine.length === 0 ? [] : [{ slug: journey.slug, title: journey.title, actions: mine }];
        }),
        data: cap.data.map((kind) => ({ name: kind.name, access: wordFor(accessKindWords, kind.access), stores: kind.stores })),
        concerns: cap.concerns.map((concern) => ({ name: concern.name, verdict: wordFor(verdictWords, concern.verdict), purpose: concern.purpose })),
        assumptions: cap.openPoints.map((point) => ({ statement: point.statement, why: point.why, ifWrong: point.ifWrong })),
        gaps: cap.gaps.map((gap) => ({ kind: wordFor(gapWords, gap.kind), reason: gap.reason, place: where(gap.place) })),
        risks: risksOfCapability(know, capId).map((risk) => ({
            slug: slugs.risk(risk.id),
            headline: titleOf(risk.statement),
            summary: summaryBeyond(risk.statement),
            detail: risk.statement,
            severity: risk.severity as "high" | "medium" | "low",
            category: risk.categoryWords,
            files: risk.places.files,
        })),
    };
};

/**
 * The texts that are copied to a clipboard, kept apart from the slice because a reader never reads them.
 * @param cap the capability payload
 * @param sys the system payload
 * @returns the briefs, by the slice's own ids
 */
export const buildBrief = (cap: Capability, sys: System): CapBrief => {
    const rules: Record<string, string> = {};
    const actions: Record<string, string> = {};
    const seenRules = new Set<string>();
    let r = 0;
    let a = 0;
    for (const layer of cap.layers) {
        for (const rule of layer.rules) {
            if (seenRules.has(rule.id)) continue;
            seenRules.add(rule.id);
            rules[`r${r}`] = rule.context.text;
            r += 1;
        }
    }
    for (const layer of cap.layers) {
        for (const action of layer.actions) {
            actions[`a${a}`] = action.context.text;
            a += 1;
        }
    }
    return {
        capability: cap.context.text,
        screens: Object.fromEntries(sys.screens.filter((screen) => screen.capabilities.includes(cap.capability.id)).map((screen) => [screen.key, screen.context.text])),
        actions,
        rules,
    };
};

/** What the index holds of a journey: its page, its title and sentence, its status and its area. */
export type JourneyLine = { readonly slug: string; readonly title: string; readonly summary: string; readonly status: string; readonly area: string | undefined };

type TargetLite = {
    readonly gates: Readonly<Record<Gate, GateView>>;
};

/** The pages that are one each, which the palette and the sidebar both name. */
export const pages = (hasPlan: boolean, hasTarget: boolean): readonly { readonly id: string; readonly headline: string; readonly summary: string; readonly href: string }[] => [
    { id: "page:journeys", headline: "Journeys", summary: "What people get done with the system, as it works today and as we propose it.", href: "journeys.html" },
    { id: "page:architecture", headline: "Architecture", summary: "How the system is built: its parts, how they talk and where today's code lands.", href: "architecture.html" },
    { id: "page:data", headline: "Data", summary: "The kinds of data and the states they pass through.", href: "data.html" },
    { id: "page:risks", headline: "Risks", summary: "Every risk the analysis found, by severity.", href: "risks.html" },
    ...(hasTarget ? [{ id: "page:decisions", headline: "Decisions", summary: "The four confirmations, in order, and where each stands.", href: "decisions.html" }] : []),
    ...(hasPlan
        ? [
              { id: "page:plan", headline: "Plan", summary: "Phases, epics and stories in delivery order.", href: "plan.html" },
              { id: "page:plan-foundation", headline: "Plan foundation", summary: "The layers and decisions of the codebase the plan builds.", href: "plan/foundation.html" },
              { id: "page:plan-coverage", headline: "Plan coverage", summary: "Which story builds each action of the old system.", href: "plan/coverage.html" },
          ]
        : []),
    { id: "page:reference", headline: "Capabilities and screens", summary: "Every capability and screen the analysis found, by area.", href: "reference.html" },
    { id: "page:rules", headline: "Business rules", summary: "Every business rule the code decides, once.", href: "rules.html" },
];

export const gateNames: Readonly<Record<Gate, string>> = {
    "as-is": "Today's journeys",
    journeys: "The proposed journeys",
    architecture: "The architecture",
    components: "Its components",
};

/**
 * The index: every thing a person can navigate to, with a headline, a summary, its place in the tree and its counts. It
 * is what the sidebar, the palette and the overview's list are built from, so it holds no rule text and no body.
 * @param input the payloads and, when the build has them, the plan and the target
 * @param input.sys the system payload
 * @param input.caps every capability payload
 * @param input.know what the analysis knows of the system as a whole
 * @param input.slugs the readable addresses
 * @param input.plan the plan, when there is one
 * @param input.target the target's tasks and decisions, when there is one
 * @returns the index
 */
export const buildIndex = (input: {
    readonly sys: System;
    readonly caps: readonly Capability[];
    readonly know: Knowledge;
    readonly slugs: Slugs;
    readonly plan?: Plan | undefined;
    readonly target?: TargetLite | undefined;
    readonly journeys?: readonly JourneyLine[] | undefined;
}): AppIndex => {
    const { sys, caps, know, slugs, plan, target, journeys = [] } = input;
    const items: IndexItem[] = [];
    const add = (item: IndexItem) => items.push(item);
    const capItem = new Map(caps.map((cap) => [cap.capability.id, `capability:${slugs.capability(cap.capability.id)}`] as const));
    const severities = (ids: readonly string[]) => {
        const wanted = new Set(ids);
        const hits = know.risks.filter((risk) => risk.places.capabilities.some((place) => wanted.has(place.id)));
        return { high: hits.filter((r) => r.severity === "high").length, medium: hits.filter((r) => r.severity === "medium").length, low: hits.filter((r) => r.severity === "low").length };
    };
    const uniqueRules = (list: readonly Capability[]) => new Set(list.flatMap((cap) => cap.layers.flatMap((layer) => layer.rules.map((rule) => rule.id)))).size;

    for (const page of pages(plan !== undefined, target !== undefined)) {
        add({ id: page.id, kind: "page", headline: page.headline, summary: page.summary, href: page.href });
    }
    add({
        id: "system:system",
        kind: "system",
        headline: "Overview",
        summary: summaryOf(sys.purpose),
        href: "index.html",
        counts: { areas: sys.areas.length, capabilities: sys.capabilities.length, screens: sys.screens.length, rules: uniqueRules(caps), risks: know.risks.length },
    });

    const areaOfCap = new Map<string, string>();
    for (const area of sys.areas) {
        const members = caps.filter((cap) => area.capabilities.includes(cap.capability.id));
        for (const member of members) areaOfCap.set(member.capability.id, `area:${slugs.area(area.id)}`);
        const sev = severities(area.capabilities);
        add({
            id: `area:${slugs.area(area.id)}`,
            kind: "area",
            headline: area.name,
            summary: titleOf(area.purpose),
            parent: "system:system",
            href: `reference.html#${slugs.area(area.id)}`,
            counts: {
                capabilities: members.length,
                screens: new Set(sys.screens.filter((s) => s.capabilities.some((c) => area.capabilities.includes(c))).map((s) => s.key)).size,
                actions: members.reduce((sum, cap) => sum + cap.totals.actions, 0),
                rules: uniqueRules(members),
                high: sev.high,
                medium: sev.medium,
                low: sev.low,
            },
        });
    }
    for (const cap of caps) {
        const sev = severities([cap.capability.id]);
        const ownScreens = sys.screens.filter((screen) => screen.capabilities.includes(cap.capability.id));
        add({
            id: capItem.get(cap.capability.id) ?? "",
            kind: "capability",
            headline: cap.capability.name,
            summary: titleOf(cap.capability.purpose),
            parent: areaOfCap.get(cap.capability.id) ?? "system:system",
            href: `capability/${slugs.capability(cap.capability.id)}.html`,
            counts: { screens: ownScreens.length, actions: cap.totals.actions, rules: uniqueRules([cap]), high: sev.high, medium: sev.medium, low: sev.low },
        });
    }
    for (const screen of sys.screens) {
        const own = caps.filter((cap) => screen.capabilities.includes(cap.capability.id));
        const [first, ...rest] = [...own].sort((one, other) => other.totals.actions - one.totals.actions || compareText(one.capability.name, other.capability.name));
        add({
            id: `screen:${screen.key}`,
            kind: "screen",
            headline: screen.name,
            summary: screen.purpose === "" ? undefined : titleOf(screen.purpose),
            ...(first === undefined ? {} : { parent: capItem.get(first.capability.id) ?? "" }),
            ...(rest.length === 0 ? {} : { also: rest.map((cap) => capItem.get(cap.capability.id) ?? "") }),
            href: `screen.html#s=${screen.key}`,
            counts: { actions: screen.actions, rules: screen.rules },
        } as IndexItem);
    }
    for (const risk of know.risks) {
        const slug = slugs.risk(risk.id);
        const first = risk.places.capabilities[0];
        add({
            id: `risk:${slug}`,
            kind: "risk",
            headline: headlineOf(risk.statement),
            ...(summaryBeyond(risk.statement) === "" ? {} : { summary: summaryBeyond(risk.statement) }),
            ...(first === undefined ? {} : { parent: capItem.get(first.id) ?? "" }),
            href: `risk/${slug}.html`,
            tags: [`risk:${risk.severity}`, risk.category],
        } as IndexItem);
    }
    for (const journey of journeys) {
        add({
            id: `journey:${journey.slug}`,
            kind: "journey",
            headline: journey.title,
            ...(journey.summary === "" ? {} : { summary: journey.summary }),
            parent: "page:journeys",
            href: `journey/${journey.slug}.html`,
            tags: [journey.status, ...(journey.area === undefined ? [] : [journey.area])],
        });
    }
    if (target !== undefined) {
        for (const gate of ["as-is", "journeys", "architecture", "components"] as const) {
            add({ id: `gate:${gate}`, kind: "gate", headline: gateNames[gate], summary: `Review and confirm: ${target.gates[gate].state}.`, parent: "page:decisions", href: `gate/${gate}.html`, tags: [target.gates[gate].state] });
        }
    }
    if (plan !== undefined) {
        for (const phase of plan.phases) {
            add({
                id: `phase:${phase.number}`,
                kind: "phase",
                headline: phase.name,
                summary: summaryOf(phase.why),
                parent: "page:plan",
                href: "plan.html",
                counts: { stories: phase.stories.length },
            });
        }
        for (const epic of plan.epics) {
            const first = plan.stories.find((story) => story.epic === epic.key);
            add({
                id: `epic:${String(epic.sequence).padStart(2, "0")}`,
                kind: "epic",
                headline: headlineOf(epic.title),
                parent: first === undefined ? "page:plan" : `phase:${first.phase}`,
                href: `${epicPath(epic)}.html`,
                counts: { stories: epic.stories.length },
                tags: [epic.kind],
            });
        }
        const epicById = new Map(plan.epics.map((epic) => [epic.key, epic] as const));
        for (const story of plan.stories) {
            const epic = epicById.get(story.epic);
            add({
                id: `story:${String(story.sequence).padStart(3, "0")}`,
                kind: "story",
                headline: headlineOf(story.title),
                parent: epic === undefined ? "page:plan" : `epic:${String(epic.sequence).padStart(2, "0")}`,
                href: `${storyPath(story)}.html`,
                tags: [...new Set([story.kind, ...story.tags])],
            });
        }
    }
    return { version: 1, hasPlan: plan !== undefined, hasTarget: target !== undefined, items };
};

/** The kinds that belong to the plan, which the shell fetches only when it needs them. */
export const planKinds: readonly string[] = ["phase", "epic", "story"];

/**
 * The index in two files: what the analysis and the target hold, which every page needs for the sidebar and the palette, and
 * the plan's phases, epics and stories, which a page fetches only when the Deliver tree opens or a plan page is shown. A
 * plan of thousands of stories then costs the pages that never look at it nothing.
 * @param index the whole index
 * @returns the main index and the plan's items
 */
export const splitIndex = (index: AppIndex) => ({
    main: { ...index, items: index.items.filter((item) => !planKinds.includes(item.kind)) } satisfies AppIndex,
    plan: { version: 1 as const, items: index.items.filter((item) => planKinds.includes(item.kind)) },
});

/**
 * The viewer's data for the layers of a capability: a layer is a group, an action is a box, and an action uses the
 * layers its path goes on to. Actions do not call each other, so the boxes have no links among themselves.
 * @param slice the capability's slice
 * @returns the data
 */
export const viewerOfSlice = (slice: CapSlice): ViewerData => {
    const groups = slice.layers.filter((layer) => layer.product || !slice.layers.some((each) => each.product));
    const index = new Map(groups.map((layer, at) => [layer.id, at] as const));
    const boxes = slice.actions.flatMap((action) => {
        const start = action.path[0];
        const g = start === undefined ? undefined : index.get(start);
        if (g === undefined) return [];
        const ug = [...new Set(action.path.slice(1).flatMap((layer) => (index.has(layer) && index.get(layer) !== g ? [index.get(layer) as number] : [])))];
        return [{ n: action.headline, g, u: [] as number[], ug, note: action.screen }];
    });
    return {
        name: slice.name,
        words: { group: "layer", groups: "layers", box: "action", boxes: "actions" },
        groups: groups.map((layer) => ({ name: layer.name, note: `${layer.actions} actions, ${layer.rules} rules` })),
        boxes,
    };
};

/**
 * The viewer's data for the target architecture: a domain is a group, a component is a box.
 * @param architecture the chosen architecture
 * @returns the data
 */
export const viewerOfArchitecture = (architecture: Architecture): ViewerData => {
    const components = architecture.components ?? [];
    const groups = architecture.domains.map((domain) => ({ name: domain.name, note: domain.concept }));
    const gi = new Map(groups.map((group, at) => [group.name, at] as const));
    const ci = new Map(components.map((component, at) => [component.name, at] as const));
    return {
        name: architecture.name,
        words: { group: "domain", groups: "domains", box: "component", boxes: "components" },
        groups,
        boxes: components.map((component) => ({
            n: component.name,
            g: gi.get(component.domain) ?? 0,
            u: component.uses.flatMap((name) => {
                const at = ci.get(name);
                return at === undefined ? [] : [at];
            }),
            note: component.responsibility,
        })),
    };
};
