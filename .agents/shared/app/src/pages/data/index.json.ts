import { buildIndex, splitIndex } from "../../lib/slice";
import { capabilities, knowledge, slugs, system } from "../../lib/payloads";
import { hasPlan, planData } from "../../lib/plan-data";
import { hasTarget, targetData } from "../../lib/target-data";
import { journeyLines } from "../../lib/journeys";

/**
 * The index of everything a person can navigate to: the sidebar, the palette and the overview's list read it.
 * @returns the index as a static file
 */
export async function GET() {
    const index = buildIndex({
        sys: await system(),
        caps: await capabilities(),
        know: await knowledge(),
        slugs: await slugs(),
        plan: hasPlan() ? (await planData()).plan : undefined,
        target: hasTarget() ? targetData() : undefined,
        journeys: await journeyLines(),
    });
    return new Response(JSON.stringify(splitIndex(index).main), { headers: { "content-type": "application/json" } });
}
