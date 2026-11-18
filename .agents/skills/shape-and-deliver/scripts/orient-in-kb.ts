import { runScript } from "./core/run-script";
import { render } from "./stages/render-order";
import { producerCommand } from "./core/record-stage";
import { orientStage } from "./stages/orient/orient-stage";

runScript(producerCommand(orientStage, render));
