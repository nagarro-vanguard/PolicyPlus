import { runScript } from "./core/run-script";
import { render } from "./stages/render-order";
import { producerCommand } from "./core/record-stage";
import { testsStage } from "./stages/tests/tests-stage";

runScript(producerCommand(testsStage, render));
