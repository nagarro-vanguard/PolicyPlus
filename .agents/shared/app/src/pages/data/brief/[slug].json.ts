import { buildBrief } from "../../../lib/slice";
import { capabilities, slugs, system } from "../../../lib/payloads";

export async function getStaticPaths() {
    const addresses = await slugs();
    return (await capabilities()).map((cap) => ({ params: { slug: addresses.capability(cap.capability.id) }, props: { id: cap.capability.id } }));
}

/**
 * The texts a person copies for a capability, its screens, actions and rules; fetched only when one is copied.
 * @param context the route's props
 * @param context.props the capability's id
 * @param context.props.id the capability's id
 * @returns the briefs as a static file
 */
export async function GET({ props }: { props: { id: string } }) {
    const cap = (await capabilities()).find((each) => each.capability.id === props.id);
    if (cap === undefined) throw new Error("no such capability");
    return new Response(JSON.stringify(buildBrief(cap, await system())), { headers: { "content-type": "application/json" } });
}
