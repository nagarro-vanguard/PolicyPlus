import { pageStyles } from "./styles";

/**
 * The page's own script: the copy buttons, with a fallback for pages opened from a file; a link into a closed
 * section opens it; every closed section opened while printing, so print shows everything.
 */
const pageScript = `
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  const source = document.getElementById(button.dataset.copy);
  const text = source ? source.innerText : button.dataset.copyText || "";
  try { await navigator.clipboard.writeText(text); } catch {
    const area = Object.assign(document.createElement("textarea"), { value: text });
    document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
  }
  const label = button.querySelector("[data-label]");
  const was = label.textContent; label.textContent = "Copied";
  document.getElementById("announce").textContent = "Copied to the clipboard";
  setTimeout(() => { label.textContent = was; }, 2000);
});
const openTarget = () => {
  const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  for (let at = target; at; at = at.parentElement?.closest("details")) { if (at.tagName === "DETAILS") at.open = true; }
  target?.scrollIntoView();
};
addEventListener("hashchange", openTarget);
openTarget();
addEventListener("beforeprint", () => document.querySelectorAll("details:not([open])").forEach((d) => { d.open = true; d.dataset.reclose = ""; }));
addEventListener("afterprint", () => document.querySelectorAll("details[data-reclose]").forEach((d) => { d.open = false; delete d.dataset.reclose; }));
`;

export type SiteAssets = { readonly stylesheet: string; readonly script: string };

/**
 * The files every site of pages writes once, at its root: the stylesheet (tokens, components, and the fonts embedded
 * inside it, so a page opened from disk in any subfolder still has them) and the page script. Each output folder
 * carries its own copy, so it opens, zips and shares on its own, and an old report never changes when this package
 * does.
 * @returns each file's path, relative to the site's root, and its text
 */
export function assetFiles(): ReadonlyArray<{ readonly path: string; readonly text: string }> {
    return [
        { path: "assets/page.css", text: pageStyles() },
        { path: "assets/page.js", text: pageScript },
    ];
}
