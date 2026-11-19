import { createHash } from "node:crypto";
import type { Site } from "./site";

// A strict Content-Security-Policy on every page, as a `<meta>` (the folder is opened from `file://` or put on any
// server, so there is no header to set). Scripts come from the site's own files or are one of the inline scripts the
// build wrote, named by their hash; styles likewise; a `style` attribute is never allowed (compact.ts moved them into
// classes); the diagram's layout engine runs in a `blob:` worker; nothing is fetched from anywhere else. Every page
// carries the same policy, the hashes of all pages together: the view transition router keeps the first page's policy
// and runs the next page's inline scripts under it.

const inlineScript = /<script(?![^>]*\ssrc=)(?![^>]*\stype="application\/json")[^>]*>([\s\S]*?)<\/script>/g;
const inlineStyle = /<style[^>]*>([\s\S]*?)<\/style>/g;
const hash = (text: string) => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

/**
 * Adds the policy to every page.
 * @param site the site in memory
 * @returns the policy
 */
export const contentSecurityPolicy = (site: Site): string => {
    const scripts = new Set<string>();
    const styles = new Set<string>();
    for (const html of site.pages.values()) {
        for (const [, code] of html.matchAll(inlineScript)) scripts.add(hash(code as string));
        for (const [, css] of html.matchAll(inlineStyle)) styles.add(hash(css as string));
    }
    const policy = [
        "default-src 'none'",
        `script-src 'self' ${[...scripts].sort().join(" ")}`.trim(),
        `style-src 'self' ${[...styles].sort().join(" ")}`.trim(),
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "worker-src blob:",
        "base-uri 'none'",
        "form-action 'none'",
    ].join("; ");
    const meta = `<meta http-equiv="content-security-policy" content="${policy}">`;
    for (const [file, html] of site.pages) {
        if (!html.includes('<meta charset="utf-8">')) throw new Error(`offline packager: ${file} has no charset to put the policy after`);
        site.pages.set(file, html.replace('<meta charset="utf-8">', `<meta charset="utf-8">${meta}`));
    }
    return policy;
};
