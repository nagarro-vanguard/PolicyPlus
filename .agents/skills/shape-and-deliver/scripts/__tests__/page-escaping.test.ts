import { describe, expect, it } from "vitest";
import { drawDiagram } from "../page-components/components/diagram";
import { jsx, trusted } from "../page-components/jsx";

describe("what a story's text can put on a page", () => {
    it("escapes every text and attribute value, and places only trusted markup as it is", () => {
        const html = jsx("a", { href: '"><script>', title: "x" }, "<b>&</b>", trusted("<i>ok</i>")).html;
        expect(html).toBe('<a href="&quot;&gt;&lt;script&gt;" title="x">&lt;b&gt;&amp;&lt;/b&gt;<i>ok</i></a>');
    });

    it("does not let a diagram label inject markup", () => {
        const drawn = drawDiagram("flowchart LR\n  A[<img src=x onerror=alert(1)>] --> B[b]");
        expect("svg" in drawn ? drawn.svg : "").not.toContain("<img");
    });
});
