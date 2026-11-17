import { Console, Effect, Path } from "effect";
import { Argument, Command } from "effect/cli";
import { readAnalysisRequest, requestHelp } from "../shared/run/analysis-request";
import { FileAccess } from "../shared/source/file-access";
import { analysisPaths } from "../shared/run/analysis-layout";
import { rememberRequest } from "../shared/store/request-guard";
import { writeLaunchers } from "../shared/jobs/launchers";
import { runScript, scriptServices } from "../shared/run/run-script";

/**
 * Read and check the request, write the run's settings and the launchers agents run the scripts by under the analysis
 * root it names, and print that root.
 * @param analysisRequestPath the request file
 * @returns the effect that does it; AnalysisRequestInvalid naming the first rule the request breaks
 */
const recordAnalysisRequest = Effect.fn("recordAnalysisRequest")(function* (analysisRequestPath: string) {
    const resolvedPath = (yield* Path.Path).resolve(analysisRequestPath);
    const { outputRoot, request } = yield* readAnalysisRequest(analysisRequestPath, (yield* Path.Path).resolve("."));
    yield* (yield* FileAccess).writeText(analysisPaths(outputRoot).analysisRequest, JSON.stringify(request, null, 2));
    yield* writeLaunchers(outputRoot);
    yield* rememberRequest(outputRoot, { path: resolvedPath, text: yield* (yield* FileAccess).readText(resolvedPath) });
    yield* Console.log(outputRoot);
});

const command = Command.make(
    "read-analysis-request",
    { analysisRequestPath: Argument.String("analysisRequestPath") },
    ({ analysisRequestPath }) => recordAnalysisRequest(analysisRequestPath),
).pipe(
    Command.withDescription(
        `Checks an analysis request, writes <Output Root>/work/analysis-request.json and prints the analysis root. ${requestHelp} Exit 1 prints \`Invalid code-analysis request: <what is wrong>.\``,
    ),
);

runScript(command, scriptServices);
