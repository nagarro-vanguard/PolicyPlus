import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { withRunLock } from "../core/run-lock";
import { run } from "./support/fixtures";

describe("one driver at a time", () => {
    it.effect("refuses a second driver while the first holds the run, and frees the run when the step ends", () =>
        Effect.gen(function* () {
            const path = join(mkdtempSync(join(tmpdir(), "shape-and-deliver-lock-")), "run.lock");
            const second = yield* run(
                withRunLock(
                    path,
                    Effect.gen(function* () {
                        return yield* Effect.flip(withRunLock(path, Effect.void));
                    }),
                ),
            );
            expect(second._tag).toBe("RunLocked");
            expect(second.message).toContain(`process ${process.pid}`);
            expect(existsSync(path)).toBe(false);
        }),
    );
});
