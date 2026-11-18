import { describe, expect, test } from "bun:test";
import {
    componentJobGaps,
    finalGaps,
    isCopy,
    journeyGaps,
    scoreOf,
    shapeGaps,
    type DesignContext,
} from "../shared/derive/checks";
import type { Architecture, Component, Journey } from "../shared/model/records";
import { build, legacy, stack } from "./fixture";

const f = build();
const [t1, t2] = f.tasks;
const context: DesignContext = { legacy, journeys: f.chosen, needs: ["external-1"], stack };
const t1Variants = (extra?: (variants: Journey[]) => Journey[]) => {
    const own = f.variants.filter((variant) => variant.task === "t1");
    return extra === undefined ? own : extra([...own]);
};
const whole = (change: (architecture: Architecture) => Architecture = (each) => each): Architecture =>
    change({ ...(f.architectures[0] as Architecture), components: [...f.components] });
const mapComponents = (change: (components: Component[]) => Component[]) =>
    whole((architecture) => ({ ...architecture, components: change([...(architecture.components ?? [])]) }));
const has = (gaps: string[], text: string) => expect(gaps.some((gap) => gap.includes(text))).toBe(true);

describe("journeys (C1, C7 and the words)", () => {
    test("the fixture passes", () => {
        expect(journeyGaps(t1 as never, t1Variants())).toEqual([]);
        expect(
            journeyGaps(
                t2 as never,
                f.variants.filter((variant) => variant.task === "t2"),
            ),
        ).toEqual([]);
    });
    test("a rule neither kept nor dropped fails C1", () => {
        const bad = t1Variants((all) =>
            all.map((variant, at) =>
                at === 0
                    ? {
                          ...variant,
                          steps: variant.steps.map((step) =>
                              step.link._tag === "legacy"
                                  ? { ...step, link: { ...step.link, keeps: step.link.keeps.slice(1) } }
                                  : step,
                          ),
                      }
                    : variant,
            ),
        );
        has(journeyGaps(t1 as never, bad), "rules are neither kept nor dropped");
    });
    test("an entry point left in no step fails C1", () => {
        const bad = t1Variants((all) =>
            all.map((variant, at) => (at === 1 ? { ...variant, steps: variant.steps.slice(0, 1) } : variant)),
        );
        has(journeyGaps(t1 as never, bad), "neither in a step nor dropped");
    });
    test("a drop with its reason makes up for it", () => {
        const dropped = t1Variants((all) =>
            all.map((variant, at) =>
                at === 1
                    ? {
                          ...variant,
                          steps: variant.steps.slice(0, 1),
                          drops: [
                              {
                                  actions: ["block-2" as never],
                                  rules: ["businessrule-2" as never],
                                  reason: "comments are not carried",
                              },
                          ],
                      }
                    : variant,
            ),
        );
        expect(journeyGaps(t1 as never, dropped).filter((gap) => gap.includes("guided"))).toEqual([]);
    });
    test("a control word in a step fails", () => {
        const bad = t1Variants((all) =>
            all.map((variant, at) =>
                at === 0
                    ? {
                          ...variant,
                          steps: variant.steps.map((step) => ({ ...step, intent: "Click the button to review" })),
                      }
                    : variant,
            ),
        );
        has(journeyGaps(t1 as never, bad), "names a medium, control or technology");
    });
    test("two recommended variants fail", () => {
        const bad = t1Variants((all) => all.map((variant) => ({ ...variant, recommended: "both" })));
        has(journeyGaps(t1 as never, bad), "exactly one variant is recommended");
    });
    test("a variant that mirrors today fails C7 when it is recommended or when all do", () => {
        expect(isCopy(f.copy, (t1 as never as { current: never }).current)).toBe(true);
        const recommended = { ...f.copy, recommended: "same as today" };
        has(journeyGaps(t1 as never, [recommended, f.copy]), "mirrors today's journey");
        has(
            journeyGaps(t1 as never, [f.copy, { ...f.copy, name: "copy 2", recommended: undefined } as never]),
            "every variant mirrors",
        );
    });
    test("a short journey today is exempt from C7", () => {
        const [only] = f.variants.filter((variant) => variant.task === "t2");
        expect(isCopy(only as never, (t2 as never as { current: never }).current)).toBe(false);
    });
});

describe("architecture at domain level (C4, C5, C6)", () => {
    test("the fixture passes and scores fully", () => {
        expect(shapeGaps(f.architectures, context)).toEqual([]);
        const score = scoreOf(f.architectures[0] as Architecture, f.chosen);
        expect(score.stepsServed).toBe(score.steps);
        expect(score.rulesAssigned).toBe(score.rules);
        expect(score.idleDomains).toEqual([]);
    });
    const mutate = (change: (architecture: Architecture) => Architecture) =>
        shapeGaps([change(f.architectures[0] as Architecture), f.architectures[1] as Architecture], context);
    test("a rule in no domain fails C4", () =>
        has(
            mutate((a) => ({
                ...a,
                domains: a.domains.map((d) => (d.name === "Policies" ? { ...d, rules: d.rules.slice(1) } : d)),
            })),
            "belong to no domain",
        ));
    test("a rule in two domains fails C4", () =>
        has(
            mutate((a) => ({
                ...a,
                domains: a.domains.map((d) =>
                    d.name === "Templates"
                        ? { ...d, rules: [...d.rules, ...(a.domains[0]?.rules.slice(0, 1) ?? [])] }
                        : d,
                ),
            })),
            "more than one domain",
        ));
    test("a technology that is no phrase of the stack fails C6", () =>
        has(
            mutate((a) => ({ ...a, containers: a.containers.map((c) => ({ ...c, tech: "Cobol" })) })),
            "no phrase of the Target Stack",
        ));
    test("a dependency cycle fails C5", () =>
        has(
            mutate((a) => ({
                ...a,
                domains: a.domains.map((d) => (d.name === "Templates" ? { ...d, dependsOn: ["Policies"] } : d)),
            })),
            "cycle",
        ));
    test("a domain held twice fails C5", () =>
        has(
            mutate((a) => ({
                ...a,
                containers: [...a.containers, { name: "again", kind: "job", tech: "Bun", holds: ["Policies"] }],
            })),
            "held by 2 containers",
        ));
    test("an outside system without an integration fails C6", () =>
        has(
            mutate((a) => ({ ...a, integrations: [] })),
            "0 integrations",
        ));
    test("a domain named like the old system fails C6", () =>
        has(
            mutate((a) => ({
                ...a,
                domains: a.domains.map((d) => (d.name === "Policies" ? { ...d, name: "DetailPolicy" } : d)),
            })),
            "old system's name",
        ));
    test("components at this stage fail", () =>
        has(
            mutate((a) => ({ ...a, components: [] })),
            "written later",
        ));
});

describe("components (C2 to C6 across the whole)", () => {
    test("the fixture passes", () => {
        expect(finalGaps(whole(), context)).toEqual([]);
        const architecture = f.architectures[0] as Architecture;
        const templates = f.components.filter((component) => component.domain === "Templates");
        expect(
            componentJobGaps(templates, {
                ...context,
                architecture,
                domain: "Templates",
                available: [],
                relevant: f.chosen[1]?.steps.map((step) => step.id) ?? [],
            }),
        ).toEqual([]);
    });
    test("a step served by no component fails C2", () =>
        has(
            finalGaps(
                mapComponents((all) => all.map((c) => ({ ...c, serves: [] as never, platform: "x" }))),
                context,
            ),
            "served by no component",
        ));
    test("a component serving nothing fails C3", () =>
        has(
            finalGaps(
                mapComponents((all) => [
                    ...all,
                    {
                        name: "idle",
                        domain: "Policies",
                        responsibility: "x",
                        module: "idle",
                        uses: [],
                        serves: [],
                        enforces: [],
                    } as never,
                ]),
                context,
            ),
            "serves no step",
        ));
    test("a rule enforced twice fails C4", () =>
        has(
            finalGaps(
                mapComponents((all) =>
                    all.map((c) =>
                        c.name === "template-reader"
                            ? { ...c, enforces: [...c.enforces, "businessrule-1" as never] }
                            : c,
                    ),
                ),
                context,
            ),
            "not one",
        ));
    test("a use across a domain that is not depended on fails C5", () =>
        has(
            finalGaps(
                whole((a) => ({
                    ...a,
                    domains: a.domains.map((d) => (d.name === "Policies" ? { ...d, dependsOn: [] } : d)),
                })),
                context,
            ),
            "does not depend on",
        ));
    test("components calling each other in a cycle fail C5", () =>
        has(
            finalGaps(
                mapComponents((all) =>
                    all.map((c) => (c.name === "template-reader" ? { ...c, uses: ["policy-service"] } : c)),
                ),
                context,
            ),
            "cycle",
        ));
    test("a missing adapter fails C6", () =>
        has(
            finalGaps(
                mapComponents((all) => all.map((c) => ({ ...c, adapts: undefined }))),
                context,
            ),
            "adapter",
        ));
    test("a job's gate refuses a component of another domain and a use that does not exist", () => {
        const architecture = f.architectures[0] as Architecture;
        const bad: Component[] = [{ ...(f.components[1] as Component), domain: "Templates", uses: ["nothing"] }];
        const gaps = componentJobGaps(bad, {
            ...context,
            architecture,
            domain: "Policies",
            available: [],
            relevant: [],
        });
        has(gaps, "belongs to domain");
        has(gaps, "uses nothing");
    });
});

describe("a store keeps the data of domains that something else runs", () => {
    const first = f.architectures[0] as Architecture;
    const withStore = (hold: string[]): Architecture => ({
        ...first,
        containers: [...first.containers, { name: "database", kind: "store", tech: "PostgreSQL", holds: hold }],
    });
    test("it passes, and does not count as holding the domains", () => {
        expect(shapeGaps([withStore(["Policies"]), f.architectures[1] as Architecture], context)).toEqual([]);
    });
    test("a part that runs logic but holds no domain fails", () => {
        const bad = {
            ...first,
            containers: [
                ...first.containers,
                { name: "idle", kind: "service" as const, tech: "TypeScript", holds: [] },
            ],
        };
        has(shapeGaps([bad, f.architectures[1] as Architecture], context), "holds no domain");
    });
});
