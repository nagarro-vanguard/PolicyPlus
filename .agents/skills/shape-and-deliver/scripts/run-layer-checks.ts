import { runScript } from "./core/run-script";
import { render } from "./stages/render-order";
import { layerChecksCommand } from "./core/layer-checks";

runScript(layerChecksCommand(render));
