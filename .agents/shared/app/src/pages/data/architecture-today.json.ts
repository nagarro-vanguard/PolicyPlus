import { viewerOfToday } from "../../lib/architecture-lenses";
import { capabilities, system } from "../../lib/payloads";

/**
 * Today's layers and the capabilities in them as the diagram viewer draws them.
 * @returns the data as a static file
 */
export async function GET() {
    return new Response(JSON.stringify(viewerOfToday(await system(), await capabilities())), { headers: { "content-type": "application/json" } });
}
