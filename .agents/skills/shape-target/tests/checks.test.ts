import { describe, expect, test } from "bun:test";
import {
    componentJobGaps,
    finalGaps,
    isCopy,
    journeyGaps,
    scoreOf,
    shapeGaps,
    variantGaps,
    type DesignContext,
} from "../shared/derive/checks";
import { Schema } from "effect";
import { gateComponents, gateShape } from "../shared/jobs/gates";
import {
    ArchitectureRecord as ArchitectureRecordSchema,
    type Architecture,
    type ArchitectureRecord,
    type Component,
    type Journey,
} from "../shared/model/records";
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
        has(journeyGaps(t1 as never, bad), "rules are neither kept, changed nor dropped");
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
                containers: [
                    ...a.containers,
                    { name: "again", kind: "job", tech: "Bun", holds: ["Policies"], does: "Runs.", runsOn: "server" },
                ],
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
    const templatesJob = () => ({
        ...context,
        architecture: f.architectures[0] as Architecture,
        domain: "Templates",
        available: [],
        relevant: f.chosen[1]?.steps.map((step) => step.id) ?? [],
    });
    test("a job's gate refuses a component that declares no kind", () => {
        const { kind: _kind, ...kindless } = f.components[0] as Component;
        has(gateComponents({ components: [kindless] }, templatesJob()), "do not match their shape");
        expect(gateComponents({ components: [f.components[0]] }, templatesJob())).toEqual([]);
    });
    test("an adapter is of kind adapter, and only an adapter is", () => {
        const reader = f.components[0] as Component;
        has(componentJobGaps([{ ...reader, kind: "data" }], templatesJob()), "so its kind is adapter, not data");
        has(
            componentJobGaps(
                [
                    { ...reader, adapts: undefined, platform: "x" },
                    { ...reader, name: "other", module: "other" },
                ],
                templatesJob(),
            ),
            "is of kind adapter but adapts no outside system",
        );
    });
    test("an interface serves at least one step", () =>
        has(
            componentJobGaps(
                [
                    {
                        ...(f.components[0] as Component),
                        kind: "interface",
                        adapts: undefined,
                        serves: [],
                        platform: "x",
                    },
                ],
                templatesJob(),
            ),
            "is of kind interface but serves no step",
        ));
    test("an architecture whose components were written before kinds existed still reads", () => {
        const older = {
            ...(f.architectures[0] as Architecture),
            components: f.components.map(({ kind: _kind, ...rest }) => rest),
        };
        expect(Schema.decodeUnknownSync(ArchitectureRecordSchema)(older).components?.[0]?.kind).toBeUndefined();
    });
});

describe("a store keeps the data of domains that something else runs", () => {
    const first = f.architectures[0] as Architecture;
    const withStore = (hold: string[]): Architecture => ({
        ...first,
        containers: [
            ...first.containers,
            { name: "database", kind: "store", tech: "PostgreSQL", holds: hold, does: "Keeps data.", runsOn: "server" },
        ],
    });
    test("it passes, and does not count as holding the domains", () => {
        expect(shapeGaps([withStore(["Policies"]), f.architectures[1] as Architecture], context)).toEqual([]);
    });
    test("a part that runs logic but holds no domain fails", () => {
        const bad = {
            ...first,
            containers: [
                ...first.containers,
                {
                    name: "idle",
                    kind: "service" as const,
                    tech: "TypeScript",
                    holds: [],
                    does: "Idles.",
                    runsOn: "server",
                },
            ],
        };
        has(shapeGaps([bad, f.architectures[1] as Architecture], context), "holds no domain");
    });
});

const firstStep = (variant: Journey, change: (step: Journey["steps"][number]) => Journey["steps"][number]) => ({
    ...variant,
    steps: variant.steps.map((step, at) => (at === 0 ? change(step) : step)),
});
const onFirst = (change: (variant: Journey) => Journey) =>
    t1Variants((all) => all.map((variant, at) => (at === 0 ? change(variant) : variant)));
const asLegacy = (step: Journey["steps"][number]) => {
    if (step.link._tag !== "legacy") throw new Error("the fixture's steps are made of entry points");
    return step.link;
};

describe("how a journey accounts for each rule: kept, changed with what it does now, or dropped with its entry point", () => {
    test("a rule a step changes, with what it does now, is accounted for and is not kept", () => {
        const changed = onFirst((variant) =>
            firstStep(variant, (step) => ({
                ...step,
                changes: [
                    {
                        rule: "businessrule-2" as never,
                        to: "A comment longer than 200 characters is cut and the person is told.",
                    },
                ],
                link: { ...asLegacy(step), keeps: ["businessrule-1" as never] },
            })),
        );
        expect(journeyGaps(t1 as never, changed, legacy)).toEqual([]);
    });
    test("a rule changed without being honoured fails", () => {
        const bad = onFirst((variant) =>
            firstStep(variant, (step) => ({
                ...step,
                honours: ["businessrule-1" as never],
                changes: [{ rule: "businessrule-2" as never, to: "A long comment is cut." }],
                link: { ...asLegacy(step), keeps: ["businessrule-1" as never] },
            })),
        );
        has(journeyGaps(t1 as never, bad), "changes rule businessrule-2 without honouring it");
    });
    test("a rule kept in one step and changed in another fails", () => {
        const guided = f.variants.find((variant) => variant.name === "guided") as Journey;
        const bad: Journey = {
            ...guided,
            steps: guided.steps.map((step, at) =>
                at === 1
                    ? {
                          ...step,
                          honours: ["businessrule-1" as never, "businessrule-2" as never],
                          changes: [
                              { rule: "businessrule-1" as never, to: "The state is shown only when it differs." },
                          ],
                      }
                    : step,
            ),
        };
        has(
            journeyGaps(t1 as never, [t1Variants()[0] as Journey, bad]),
            "is kept as it is in step 1 and changed in step 2",
        );
    });
    test("a step that honours a rule it neither keeps nor changes fails, so honours and keeps say one thing", () => {
        const bad = onFirst((variant) =>
            firstStep(variant, (step) => ({
                ...step,
                link: { ...asLegacy(step), keeps: ["businessrule-1" as never] },
            })),
        );
        has(journeyGaps(t1 as never, bad), "honours rule businessrule-2 but neither keeps nor changes it");
    });
    test("a drop with no entry point fails and says how to resolve it", () => {
        const bad = onFirst((variant) =>
            firstStep(
                {
                    ...variant,
                    drops: [{ actions: [], rules: ["businessrule-2" as never], reason: "comments are not checked" }],
                },
                (step) => ({
                    ...step,
                    honours: ["businessrule-1" as never],
                    link: { ...asLegacy(step), keeps: ["businessrule-1" as never] },
                }),
            ),
        );
        const gaps = journeyGaps(t1 as never, bad, legacy);
        has(gaps, "leaves out businessrule-2 without an entry point");
        has(gaps, "say in its `changes` what the rule does now");
    });
    test("a dropped rule must belong to an entry point the variant drops", () => {
        const guided = f.variants.find((variant) => variant.name === "guided") as Journey;
        const dropping = (rules: string[]): Journey => ({
            ...guided,
            steps: [
                {
                    ...(guided.steps[0] as Journey["steps"][number]),
                    honours: rules.includes("businessrule-1") ? [] : ["businessrule-1" as never],
                    touches: ["entity-1" as never],
                    link: {
                        ...asLegacy(guided.steps[0] as never),
                        keeps: rules.includes("businessrule-1") ? [] : ["businessrule-1" as never],
                    },
                },
            ],
            drops: [{ actions: ["block-2" as never], rules: rules as never, reason: "comments are not carried" }],
        });
        const wrong = journeyGaps(
            t1 as never,
            [t1Variants()[0] as Journey, dropping(["businessrule-2", "businessrule-1"])],
            legacy,
        );
        has(wrong, "drops rule businessrule-1, which belongs to no entry point the variant drops");
        const right = journeyGaps(t1 as never, [t1Variants()[0] as Journey, dropping(["businessrule-2"])], legacy);
        expect(right.filter((gap) => gap.includes("belongs to no entry point"))).toEqual([]);
    });
    test("two names that give one id fail", () => {
        const [first, second] = t1Variants() as [Journey, Journey];
        has(journeyGaps(t1 as never, [first, { ...second, name: "Streamlined!" }]), "would get one id");
    });
});

describe("the voice of what the writers author", () => {
    const say = (change: (variant: Journey) => Journey) => journeyGaps(t1 as never, onFirst(change));
    test("a superlative in a recommendation fails", () =>
        has(
            say((v) => ({ ...v, recommended: "The simplest way to note a comment." })),
            "superlative",
        ));
    test("a promise that every rule is kept fails", () =>
        has(
            say((v) => ({ ...v, recommended: "The person notes a comment in one go while keeping every rule." })),
            "every rule is kept",
        ));
    test("a claim of how many steps it takes fails, in a recommendation or a reason", () => {
        has(
            say((v) => ({ ...v, recommended: "Fewer steps for the person." })),
            "how many steps",
        );
        has(
            say((v) => ({ ...v, recommended: "A shorter way to note a comment." })),
            "how many steps",
        );
        has(
            say((v) => firstStep(v, (s) => ({ ...s, link: { ...asLegacy(s), reason: "Two steps become one." } }))),
            "how many steps",
        );
    });
    test("the goal read back fails", () =>
        has(
            say((v) => ({ ...v, recommended: "It asks for less and feels more intuitive." })),
            "design goal",
        ));
    test("a dash, a drop reason or a trade-off of two sentences fail", () => {
        has(
            say((v) => ({ ...v, tradeoff: "Less detail is shown. The person must ask for it." })),
            "more than one sentence",
        );
        has(
            say((v) => ({ ...v, recommended: "The person notes a comment — at once." })),
            "dash",
        );
        has(
            say((v) => ({
                ...v,
                drops: [{ actions: [], rules: [], reason: "Nobody needs it — ever." }],
            })),
            "drop 1: the reason has",
        );
    });
    test("what a rule does now must be one plain sentence", () =>
        has(
            say((v) =>
                firstStep(v, (s) => ({
                    ...s,
                    changes: [{ rule: "businessrule-2" as never, to: "A long comment is cut. The person is told." }],
                    link: { ...asLegacy(s), keeps: ["businessrule-1" as never] },
                })),
            ),
            "what rule businessrule-2 does now is more than one sentence",
        ));
    test("words in quotes are the old system's, not the writer's", () =>
        expect(
            say((v) => ({ ...v, recommended: 'The person sees "fewer steps" only where the old wording said so.' })),
        ).toEqual([]));
});

describe("architecture: structured risks, what each part does and where it runs", () => {
    const first = f.architectures[0] as Architecture;
    const second = f.architectures[1] as Architecture;
    const gapsOf = (change: (a: Architecture) => Architecture) => shapeGaps([change(first), second], context);
    test("a risk citing no part that exists, or contained by none, fails", () => {
        has(
            gapsOf((a) => ({ ...a, risks: [{ statement: "It may fail.", kind: "question", cites: ["Nowhere"] }] })),
            "cites Nowhere",
        );
        has(
            gapsOf((a) => ({
                ...a,
                risks: [{ statement: "It may fail.", kind: "accepted", cites: ["Policies"], containedBy: "Nothing" }],
            })),
            "contained by Nothing",
        );
    });
    test("a risk, a trade-off and what a part does are checked for their voice", () => {
        has(
            gapsOf((a) => ({
                ...a,
                risks: [{ statement: "The safest cut. It has one part.", kind: "accepted", cites: ["Policies"] }],
            })),
            "risk 1",
        );
        has(
            gapsOf((a) => ({
                ...a,
                containers: a.containers.map((c) => ({ ...c, does: "Seamlessly keeps every single policy." })),
            })),
            "what container application does",
        );
        has(
            gapsOf((a) => ({ ...a, tradeoff: "It costs more. It runs slower." })),
            "the tradeoff is more than one sentence",
        );
    });
    test("a part read back with a place to run that is not in the catalogue fails", () =>
        has(
            variantGaps({ ...first, containers: first.containers.map((c) => ({ ...c, runsOn: "the moon" })) }, context),
            'runs on "the moon"',
        ));
    test("a variant read back from before risks were structured passes, its risks unlinked", () => {
        const older: ArchitectureRecord = {
            ...first,
            risks: ["Everything runs in one process."],
            containers: first.containers.map(({ does: _does, runsOn: _runsOn, ...rest }) => rest),
        };
        expect(variantGaps(older, context)).toEqual([]);
    });
});

describe("a domain depends on another exactly when a component uses one of its", () => {
    test("a declared dependency no component uses fails", () => {
        const gaps = finalGaps(
            mapComponents((all) => all.map((c) => ({ ...c, uses: [] }))),
            context,
        );
        has(gaps, "domain Policies depends on Templates, but none of its components uses one of Templates's");
    });
    test("a use the domain does not declare fails, and says what to do", () =>
        has(
            finalGaps(
                whole((a) => ({
                    ...a,
                    domains: a.domains.map((d) => (d.name === "Policies" ? { ...d, dependsOn: [] } : d)),
                })),
                context,
            ),
            "add Templates to what Policies depends on",
        ));
    test("a changed rule must still be decided by a domain and enforced", () => {
        const changed = f.chosen.map((journey, at) =>
            at === 0
                ? {
                      ...journey,
                      steps: journey.steps.map((step) => ({
                          ...step,
                          changes: [{ rule: "businessrule-9" as never, to: "Something new." }],
                      })),
                  }
                : journey,
        );
        has(
            shapeGaps(f.architectures, { ...context, journeys: changed }),
            "kept rules belong to no domain: businessrule-9",
        );
    });
});

describe("a new proposal must say what each part does and where it runs, and structure its risks", () => {
    const raw = JSON.parse(JSON.stringify(f.architectures)) as Record<string, unknown>[];
    test("the fixture's proposals pass the gate", () => expect(gateShape({ architectures: raw }, context)).toEqual([]));
    test("a part without `does` or `runsOn`, a place to run outside the catalogue, or a risk as a plain sentence fails", () => {
        const without = raw.map((a) => ({
            ...a,
            containers: (a.containers as Record<string, unknown>[]).map(({ does: _does, ...rest }) => rest),
        }));
        has(gateShape({ architectures: without }, context), "do not match their shape");
        const elsewhere = raw.map((a) => ({
            ...a,
            containers: (a.containers as Record<string, unknown>[]).map((c) => ({ ...c, runsOn: "the moon" })),
        }));
        has(gateShape({ architectures: elsewhere }, context), "do not match their shape");
        has(
            gateShape({ architectures: raw.map((a) => ({ ...a, risks: ["more to run"] })) }, context),
            "do not match their shape",
        );
        has(
            gateShape(
                {
                    architectures: raw.map((a) => ({
                        ...a,
                        risks: [{ statement: "x y z.", kind: "accepted", cites: [] }],
                    })),
                },
                context,
            ),
            "do not match their shape",
        );
    });
});
