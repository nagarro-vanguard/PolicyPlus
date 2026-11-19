import { viewerOfModernized } from "../../lib/architecture-lenses";
import { hasTarget, targetData } from "../../lib/target-data";

/**
 * The chosen architecture as the diagram viewer draws it: domains, components and who uses whom. Empty when there is none.
 * @returns the data as a static file
 */
export async function GET() {
    const architecture = hasTarget() ? targetData().architecture : undefined;
    return new Response(JSON.stringify(architecture === undefined ? null : viewerOfModernized(architecture)), { headers: { "content-type": "application/json" } });
}
