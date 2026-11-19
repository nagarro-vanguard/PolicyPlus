import { buildSlice } from "../../../lib/slice";
import { capabilities, knowledge, productLayers, slugs, system } from "../../../lib/payloads";
import { journeyModel } from "../../../lib/journeys";
import { titleOfJourney } from "../../../lib/journey-join";

export async function getStaticPaths() {
    const addresses = await slugs();
    return (await capabilities()).map((cap) => ({ params: { slug: addresses.capability(cap.capability.id) }, props: { id: cap.capability.id } }));
}

/**
 * One capability's slice: its screens, actions, rules (each once), layers, data and risks.
 * @param context the route's props
 * @param context.props the capability's id
 * @param context.props.id the capability's id
 * @returns the slice as a static file
 */
export async function GET({ props }: { props: { id: string } }) {
    const sys = await system();
    const cap = (await capabilities()).find((each) => each.capability.id === props.id);
    if (cap === undefined) throw new Error("no such capability");
    const { journeys } = await journeyModel();
    const used = journeys.map((journey) => ({ slug: journey.slug, title: titleOfJourney(journey), actions: journey.today.actions }));
    return new Response(JSON.stringify(buildSlice(cap, sys, await knowledge(), await slugs(), productLayers(sys), used)), { headers: { "content-type": "application/json" } });
}
