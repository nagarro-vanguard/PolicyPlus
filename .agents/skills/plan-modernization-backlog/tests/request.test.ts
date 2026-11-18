import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { parseRequest, RequestInvalid } from "../shared/model/request";

const base = mkdtempSync(`${tmpdir()}/req-`);
const good = (stack = "- TypeScript on Bun\n- data: PostgreSQL") => `# Modernization Request
## Output Root
${base}/.modernization
## Source Roots
- ${base}
## Leave Out
- **/*.resx: designer files
## Target Codebase
- ${base}/Web
## Target Stack
${stack}
## Documents
None
## Additional Notes
None
`;

describe("the request", () => {
    test("reads every section and resolves paths", () => {
        const request = parseRequest(good(), base);
        expect(request.stack).toEqual(["TypeScript on Bun", "data: PostgreSQL"]);
        expect(request.leaveOut).toEqual([{ pattern: "**/*.resx", reason: "designer files" }]);
        expect(request.documents).toEqual([]);
        expect(request.notes).toEqual([]);
        expect(request.target).toBe(`${base}/Web`);
    });
    test("a missing or empty Target Stack is refused with the reason", () => {
        for (const text of [
            good("").replace("## Target Stack\n", "## Target Stack\n"),
            good("None"),
            good("").split("## Target Stack")[0] ?? "",
        ]) {
            expect(() => parseRequest(text, base)).toThrow(RequestInvalid);
        }
        expect(() => parseRequest(good(""), base)).toThrow(/Target Stack/);
    });
    test("every problem is reported at once", () => {
        try {
            parseRequest("## Output Root\n\n## Leave Out\n- no colon here\n", base);
            throw new Error("should have failed");
        } catch (error) {
            expect((error as RequestInvalid).problems.length).toBeGreaterThanOrEqual(4);
        }
    });
    test("a Windows path in Documents keeps its colon", () => {
        const text = good().replace("## Documents\nNone", "## Documents\n- C:\\docs\\rfp.pdf: the RFP");
        expect(parseRequest(text, base).documents[0]?.whatItIs).toBe("the RFP");
    });
    test("notes are kept one statement each", () => {
        const text = good().replace(
            "## Additional Notes\nNone",
            "## Additional Notes\n- Old and new run side by side.\n- Money is exact.",
        );
        expect(parseRequest(text, base).notes).toHaveLength(2);
    });
});
