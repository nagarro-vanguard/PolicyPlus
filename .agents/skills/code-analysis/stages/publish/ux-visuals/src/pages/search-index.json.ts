import { capabilities, screenHref, slugs, system } from "../lib/payloads";

/**
 * The index the search reads: one entry per capability, screen, action and rule, with where it leads.
 * @returns the index as a static file
 */
export async function GET() {
    const sys = await system();
    const all = await capabilities();
    const addresses = await slugs();
    const entries = [
        ...sys.screens.map((screen) => ({
            k: "Screens",
            t: `${screen.name} ${screen.files.join(" ")}`,
            l: screen.name,
            h: screenHref("", screen.key),
        })),
        ...all.flatMap((cap) => {
            const cs = addresses.capability(cap.capability.id);
            return [
                {
                    k: "Capabilities",
                    t: `${cap.capability.name} ${cap.capability.purpose}`,
                    l: cap.capability.name,
                    h: `capability/${cs}.html`,
                },
                ...cap.layers.flatMap((layer) => [
                    ...layer.actions.map((action) => ({
                        k: "Actions",
                        t: `${action.purpose} ${action.name}`,
                        l: `${action.purpose} · ${cap.capability.name}`,
                        h: `action/${cs}/${addresses.action(cap.capability.id, action.id)}.html`,
                    })),
                    ...layer.rules.map((rule) => ({
                        k: "Business rules",
                        t: rule.says,
                        l: `${rule.says} · ${cap.capability.name}`,
                        h: `layer/${cs}/${addresses.layer(cap.capability.id, layer.id)}.html`,
                    })),
                ]),
            ];
        }),
    ];
    return new Response(JSON.stringify(entries), { headers: { "Content-Type": "application/json" } });
}
