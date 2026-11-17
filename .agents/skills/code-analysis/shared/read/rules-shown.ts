import type { Lines as LinesSchema } from "../model/shared-fields";

type Lines = typeof LinesSchema.Type;

export type LifeShown = {
    readonly entity: string;
    readonly life:
        | { readonly _tag: "states"; readonly fields: readonly string[]; readonly states: readonly StateShown[] }
        | { readonly _tag: "none"; readonly why: string };
    readonly transitions: readonly TransitionShown[];
};

type StateShown = { readonly name: string; readonly writtenAs: string };

export type TransitionShown = {
    readonly id: string;
    readonly reading: Reading;
    readonly from: "created" | readonly string[];
    readonly to: string;
    readonly writtenAt: Lines;
    readonly madeBy: readonly string[];
    readonly moreMadeBy: number;
    readonly studied: boolean;
    readonly gatedBy: readonly string[];
};

export type RuleShown = {
    readonly id: string;
    readonly reading: Reading;
    readonly says: string;
    readonly decidedAt: Lines;
    readonly appliedBy: readonly string[];
    readonly moreAppliedBy: number;
};

export type Reading = "reviewed" | "corrected" | "disputed" | "unread";
