import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Schema } from "effect";
import { chooseArchitecture, chooseAsIs, chooseJourneys } from "../shared/choose";
import { deriveCurrent } from "../shared/derive/current";
import { disputesPath, loadDisputes } from "../shared/disputes";
import { gateState, snapshotOf, subjectOf } from "../shared/gates";
import { done, next } from "../shared/jobs/driver";
import { finish } from "../shared/jobs/finish";
import { prepare } from "../shared/jobs/stages";
import { jobPaths } from "../shared/jobs/state";
import { CONTRACT_VERSION, loadManifest } from "../shared/manifest";
import { layoutOf } from "../shared/model/layout";
import { Choice } from "../shared/model/records";
import { loadChoice } from "../shared/run";
import { changedSince } from "../shared/since";
import { build, legacy, stack } from "./fixture";

const write = (path: string, value: unknown) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const layout = layoutOf(mkdtempSync(join(tmpdir(), "shape-decisions-")));
const f = build("browsing.");
type Dispatch = { action: string; agents: { job: string; role: string }[] };

/** Plays the stage's agents; the reviewer challenges the first record every time it reads. */
const play = (outputs: Record<string, unknown>, challenge: string) => {
    for (let round = 0; round < 12; round++) {
        const action = next(layout, "/skill", "run", 4) as unknown as Dispatch;
        if (action.action !== "dispatch") return;
        for (const agent of action.agents) {
            const p = jobPaths(layout, agent.job);
            if (agent.role === "writer") write(p.output, outputs[agent.job]);
            else {
                const out = JSON.parse(readFileSync(p.output, "utf8")) as Record<string, unknown[]>;
                const read = Object.values(out).reduce((sum, list) => sum + list.length, 0);
                write(p.review, { read, challenges: [{ record: 0, says: challenge }] });
            }
            done(layout, agent.job);
        }
    }
};

describe("a confirmed decision keeps the hash and a copy of what it was made about", () => {
    test("the as-is records its hash and copy, and the manifest names the contract", () => {
        write(layout.requestJson, { stack, notes: [] });
        write(layout.legacy, legacy);
        write(join(layout.payloads, "journeys.json"), { journeys: f.tasks });
        expect(deriveCurrent(layout).ok).toBe(true);
        expect(chooseAsIs(layout, [], "reads right").ok).toBe(true);
        const choice = loadChoice(layout.choiceAsIs);
        expect(choice?.subject).toBe(subjectOf(layout.current));
        expect(readFileSync(snapshotOf(layout, "as-is"), "utf8")).toBe(readFileSync(layout.current, "utf8"));
        const manifest = loadManifest(layout);
        expect(manifest?.contractVersion).toBe(CONTRACT_VERSION);
        expect(Object.keys(manifest?.files ?? {})).toEqual(
            expect.arrayContaining(["current.json", "choice-as-is.json", "legacy.json"]),
        );
        expect(changedSince(layout, "as-is")).toEqual({ added: [], removed: [], changed: [] });
    });

    test("a challenge that survives its fix names the journey it is about, and blocks the pick until accepted", () => {
        prepare(layout, "journeys");
        play({ "variants-1": { journeys: f.variants } }, "the step drops a refusal");
        expect(finish(layout, "journeys").ok).toBe(true);
        const disputes = loadDisputes(layout, "journeys");
        expect(disputes).toEqual([
            { job: "variants-1", record: 0, variant: "browsing.t1:streamlined", says: "the step drops a refusal" },
        ]);
        const refused = chooseJourneys(layout, {}, true, "take the recommendations");
        expect(refused.ok).toBe(false);
        expect(refused.text).toContain("browsing.t1:streamlined: the step drops a refusal");
        expect(refused.text).toContain("--accept-disputes");
        expect(existsSync(layout.choiceJourneys)).toBe(false);
        expect(chooseJourneys(layout, { "browsing.t1": "guided" }, true, "the other way").ok).toBe(true);
        const accepted = chooseJourneys(layout, {}, true, "take the recommendations", true);
        expect(accepted.ok).toBe(true);
        const choice = loadChoice(layout.choiceJourneys);
        expect(choice?.acceptedDisputes).toEqual(disputes);
        expect(choice?.picks.map((pick) => pick.id)).toEqual(["browsing.t1:streamlined", "browsing.t2:automatic"]);
        expect(gateState(layout, "journeys")).toBe("confirmed");
    });

    test("what changed since the person confirmed is found by comparing with the copy", () => {
        const variants = JSON.parse(readFileSync(layout.journeyVariants, "utf8")) as { id: string; idea: string }[];
        write(
            layout.journeyVariants,
            variants.map((each) => (each.id === "browsing.t2:asked" ? { ...each, idea: "asked again" } : each)),
        );
        expect(gateState(layout, "journeys")).toBe("changed");
        expect(changedSince(layout, "journeys")).toEqual({ added: [], removed: [], changed: ["browsing.t2:asked"] });
        write(layout.journeyVariants, variants);
        expect(gateState(layout, "journeys")).toBe("confirmed");
    });

    test("an architecture with an open challenge is refused until accepted", () => {
        prepare(layout, "architecture");
        play({ shape: { architectures: f.architectures } }, "the store is not named");
        expect(finish(layout, "architecture").ok).toBe(true);
        expect(loadDisputes(layout, "architecture")[0]?.variant).toBe("modular");
        expect(chooseArchitecture(layout, "modular", "a small team").ok).toBe(false);
        expect(chooseArchitecture(layout, "split", "no open challenge").ok).toBe(true);
        expect(chooseArchitecture(layout, "modular", "a small team", true).ok).toBe(true);
    });

    test("a disputes file written before disputes named their variant is read with the variant found", () => {
        write(disputesPath(layout, "journeys"), [
            { job: "variants-1", says: "Record 2: the folder is never asked for" },
        ]);
        expect(loadDisputes(layout, "journeys")).toEqual([
            { job: "variants-1", record: 2, variant: "browsing.t2:automatic", says: "the folder is never asked for" },
        ]);
    });

    test("a decision recorded before hashes, picks by id and disputes were kept still reads", () => {
        const older = {
            decision: "journeys",
            picks: [{ of: "t1", variant: "x" }],
            reason: "ok",
            confirmedAt: "2026-01-01T00:00:00.000Z",
        };
        expect(Schema.decodeUnknownSync(Choice)(older) as unknown).toEqual(older);
    });
});
