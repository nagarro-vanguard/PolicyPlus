import { capabilities, slugs } from "../../lib/payloads";
import { ruleLines } from "../../lib/rules-data";

/**
 * Every business rule once, which the rules reference draws a few at a time.
 * @returns the rules as a static file
 */
export async function GET() {
    return new Response(JSON.stringify(ruleLines(await capabilities(), await slugs())), { headers: { "content-type": "application/json" } });
}
