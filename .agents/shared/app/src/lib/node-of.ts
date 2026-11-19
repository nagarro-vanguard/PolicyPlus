// Which entry of the index a page is: the shell marks it in the sidebar, opens its path and builds the related list from it.
// A page names itself from its address, so no page has to say so; a page that cannot be told from its address passes `node`.

/**
 * The index id of a page, from its place below the site's root without the extension.
 * @param here the place, such as `capability/browsing`, `plan/story/003-set-up`, `risks` or `index`
 * @returns the index id, or empty when the page is not in the index
 */
export const nodeOf = (here: string): string => {
    const parts = here.split("/").filter((part) => part !== "");
    const [head = "", second = "", third = ""] = parts;
    const number = (text: string) => /^(\d+)-/.exec(text)?.[1] ?? "";
    if (here === "index" || here === "") return "system:system";
    if (head === "capability" && second !== "") return `capability:${second}`;
    if (head === "area" && second !== "") return "page:reference";
    if (head === "journey" && second !== "") return `journey:${second}`;
    if (head === "risk" && second !== "") return `risk:${second}`;
    if (head === "gate" && second !== "") return `gate:${second}`;
    if (head === "plan" && second === "story" && third !== "") return `story:${number(third)}`;
    if (head === "plan" && second === "epic" && third !== "") return `epic:${number(third)}`;
    if (head === "plan" && parts.length === 1) return "page:plan";
    if (head === "plan" && second === "foundation") return "page:plan-foundation";
    if (head === "plan" && second === "coverage") return "page:plan-coverage";
    const pages: Record<string, string> = {
        journeys: "page:journeys",
        architecture: "page:architecture",
        data: "page:data",
        risks: "page:risks",
        decisions: "page:decisions",
        reference: "page:reference",
        rules: "page:rules",
    };
    return pages[here] ?? "";
};
