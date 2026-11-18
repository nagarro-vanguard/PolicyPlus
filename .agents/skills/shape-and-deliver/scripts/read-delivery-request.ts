import { Console, Effect } from "effect";
import { Argument, Command } from "effect/cli";
import { decodeDeliveryLaunch } from "./core/delivery-request";
import { recordDeliveryRequest } from "./core/launch";
import { render } from "./stages/render-order";
import { runScript } from "./core/run-script";
import { System } from "./core/system";

const command = Command.make(
    "read-delivery-request",
    { launchPath: Argument.String("launchPath").pipe(Argument.withDescription("The launch file, in JSON.")) },
    Effect.fn("ReadDeliveryRequest.readDeliveryRequest")(function* ({ launchPath }) {
        const launch = yield* decodeDeliveryLaunch(yield* (yield* System).readText(launchPath));
        return yield* Effect.flatMap(recordDeliveryRequest(render, launch, process.cwd()), Console.log);
    }),
).pipe(
    Command.withDescription(
        "Checks a typed shape-and-deliver launch (JSON), the codebase's AGENTS.md contract and the branch, then writes the run's request and the mode `next` drives into the run folder, lifts a stop the run held, and prints the run folder. Launching the same plan again resumes the run; a changed kind or work item sets the earlier plan aside and plans again, and changed instructions or supporting material have each plan agent update its output. A launch that is not in the shape shape-and-deliver reads is refused with that shape in the message.",
    ),
);

runScript(command);
