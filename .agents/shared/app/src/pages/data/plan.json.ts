import { buildIndex, splitIndex } from "../../lib/slice";
import { capabilities, knowledge, slugs, system } from "../../lib/payloads";
import { hasPlan, planData } from "../../lib/plan-data";

/**
 * The plan's phases, epics and stories as index items, fetched when the Deliver tree opens, a plan page is shown or the
 * palette is used. Empty when the build has no plan.
 * @returns the items as a static file
 */
export async function GET() {
    const plan = hasPlan() ? (await planData()).plan : undefined;
    const index = buildIndex({ sys: await system(), caps: await capabilities(), know: await knowledge(), slugs: await slugs(), plan });
    return new Response(JSON.stringify(splitIndex(index).plan), { headers: { "content-type": "application/json" } });
}
