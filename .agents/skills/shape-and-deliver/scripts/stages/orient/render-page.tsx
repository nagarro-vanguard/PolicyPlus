/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { DataTable } from "../../page-components/components/data";
import { Section } from "../../page-components/components/page";
import { jsx } from "../../page-components/jsx";
import { drawWith, foundOf, type StageView } from "../../core/stage-run-frame";
import type { Model } from "../../core/stage-model";
import type { OrientFound } from "./render-model";
import { orientFound } from "./render-read";
import { producerDecisions, producerStanding } from "../producer-reads";

type Found = typeof OrientFound.Type;

/** Which way a seam crosses, in the approver's words. */
const directionWords = { in: "In", out: "Out", both: "Both ways" } as const;

/**
 * Lists the things of the product the story touches.
 * @param props the component's inputs
 * @param props.found the orientation
 * @returns the table
 */
const EntitiesTable = ({ found }: { found: Found }) => (
    <DataTable
        caption="The things of the product the story touches"
        columns={[
            { key: "entity", label: "Thing", rowHeader: true },
            { key: "how", label: "The story" },
            { key: "states", label: "Its states" },
        ]}
        rows={found.entities.map((entity) => ({ entity: entity.entity, how: entity.how, states: entity.states }))}
        empty="The story touches nothing yet recorded."
    />
);

/**
 * Shows the approver the entities the story touches, then, when there are any, the facts that must keep holding with
 * what keeps and proves each, the journeys it changes and the seams it crosses. Notes when the codebase has no knowledge
 * base.
 * @param props the component's inputs
 * @param props.found the orientation
 * @returns the section
 */
const Touches = ({ found }: { found: Found }) => (
    <Section id="touches" title="What this touches in the product">
        {!found.knowledge && <p>This codebase has no knowledge base, so the plan rests on the story and the code.</p>}
        {found.knowledge && <EntitiesTable found={found} />}
        {found.invariants.length > 0 && (
            <DataTable
                caption="The facts that must keep holding, and what protects each"
                columns={[
                    { key: "fact", label: "Fact at risk", rowHeader: true },
                    { key: "kept", label: "Kept by" },
                    { key: "proved", label: "Proved by" },
                ]}
                rows={found.invariants.map((each) => ({
                    fact: each.invariant.why,
                    kept: each.keptBy.length === 0 ? "Nothing yet" : each.keptBy.join(" "),
                    proved: each.provenBy.length === 0 ? "No test yet" : each.provenBy.join(" "),
                }))}
                empty="None."
            />
        )}
        {found.journeys.length > 0 && (
            <DataTable
                caption="The journeys the story changes"
                columns={[{ key: "why", label: "How it changes", rowHeader: true }]}
                rows={found.journeys.map((journey) => ({ why: journey.why }))}
                empty="None."
            />
        )}
        {found.seams.length > 0 && (
            <DataTable
                caption="Where the story meets the outside"
                columns={[
                    { key: "what", label: "What crosses", rowHeader: true },
                    { key: "direction", label: "Direction" },
                    { key: "outside", label: "With" },
                ]}
                rows={found.seams.map((seam) => ({
                    what: seam.what,
                    direction: directionWords[seam.direction],
                    outside: seam.outside,
                }))}
                empty="None."
            />
        )}
    </Section>
);

/**
 * Lists for an engineer each fact at risk with the files that keep it and the tests that prove it.
 * @param props the component's inputs
 * @param props.found the orientation
 * @returns the section
 */
const Protection = ({ found }: { found: Found }) => (
    <Section id="protection" title="What keeps each fact" reader="engineer">
        <DataTable
            caption="Each fact at risk, the files that keep it and the tests that prove it"
            columns={[
                { key: "fact", label: "Fact", rowHeader: true },
                { key: "files", label: "Files" },
                { key: "tests", label: "Tests" },
            ]}
            rows={found.invariants.map((each) => ({
                fact: each.invariant.kbFile,
                files: each.files.join(", "),
                tests: each.titles.join(", "),
            }))}
            empty="No fact is at risk."
        />
    </Section>
);

/**
 * Gives the approver what the story touches and the engineer what protects each fact, once there are findings.
 * @param model the stage's model
 * @returns what each reader sees
 */
const orientView = (model: Model<Found, Found>): StageView => {
    const found = foundOf(model);
    return found === undefined ? {} : { approver: <Touches found={found} />, engineer: <Protection found={found} /> };
};

export const orientDraw = drawWith({
    stage: "orient",
    standing: (run) => producerStanding(run, "orient", "The orientation"),
    progress: (run) => ({ rounds: run.rounds.orient.rounds, maxRounds: run.rounds.orient.maxRounds }),
    decisions: (run) => producerDecisions(run, "orient"),
    running: orientFound,
    done: orientFound,
    headline: (found) => [
        { of: "EntityTouched", count: found.entities.length },
        { of: "InvariantAtRisk", count: found.invariants.length },
    ],
    view: orientView,
});
