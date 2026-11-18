import { runScript } from "./core/run-script";
import { render } from "./stages/render-order";
import { reviewCommand } from "./core/review-stage";

runScript(reviewCommand(render));
