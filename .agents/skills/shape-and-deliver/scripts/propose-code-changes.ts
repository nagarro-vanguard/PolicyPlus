import { runScript } from "./core/run-script";
import { render } from "./stages/render-order";
import { producerCommand } from "./core/record-stage";
import { changesStage } from "./stages/changes/changes-stage";

runScript(producerCommand(changesStage, render));
