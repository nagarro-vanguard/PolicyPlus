import { runScript } from "./core/run-script";
import { render } from "./stages/render-order";
import { fixCommand } from "./stages/code/fix";

runScript(fixCommand(render));
