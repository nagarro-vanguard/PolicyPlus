import { runScript } from "./core/run-script";
import { render } from "./stages/render-order";
import { producerCommand } from "./core/record-stage";
import { traceStage } from "./stages/trace/trace-stage";

runScript(producerCommand(traceStage, render));
