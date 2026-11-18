import { Result } from "effect";
import { parseXml, type XmlElement } from "./xml";

/** One test of a layer's JUnit XML, in the shape of `proof.json`'s tests. */
export type JunitTest = {
    readonly title: string;
    readonly acs: readonly string[];
    readonly passed: boolean;
    readonly message?: string;
};

const messageKept = 1000;

/** A test the plan declares: the criterion it proves and its title as the test layer reports it. */
export type PlannedTest = { readonly ac: string; readonly title: string };

/**
 * Lowercases a text and collapses every run of white space and suite separator (`>` in Vitest, `›` in Playwright)
 * to one space, so titles compare by their words however the runner joins a describe to its test.
 * @param text the text
 * @returns the text in comparable form
 */
const comparable = (text: string) =>
    text
        .toLowerCase()
        .replaceAll("\n", " ")
        .replaceAll("\t", " ")
        .replaceAll(">", " ")
        .replaceAll("›", " ")
        .split(" ")
        .filter(Boolean)
        .join(" ");

/**
 * Finds the criteria a test proves by the plan: the criteria whose planned title the test's classname and name
 * contain, ignoring case and spacing, so a describe prefix before the planned title still matches.
 * @param text the test's classname and name
 * @param planned the plan's acceptance tests
 * @returns the criteria, or none when the test matches no planned title
 * @public
 */
export const criteriaPlanned = (text: string, planned: readonly PlannedTest[]) => {
    const words = comparable(text);
    return [
        ...new Set(
            planned
                .filter(({ title }) => comparable(title) !== "" && words.includes(comparable(title)))
                .map(({ ac }) => ac),
        ),
    ];
};

/**
 * Every descendant `testcase` element, in document order.
 * @param element the element to search
 * @returns its test cases, however deep the test suites nest
 */
const testCasesIn = (element: XmlElement): XmlElement[] =>
    element.children.flatMap((child) => (child.name === "testcase" ? [child] : testCasesIn(child)));

/**
 * Reads one test case: a failure, an error or a skip means it did not pass.
 * @param testcase the element
 * @param planned the plan's acceptance tests
 * @returns the test
 */
const testOf = (testcase: XmlElement, planned: readonly PlannedTest[]): JunitTest => {
    const name = testcase.attributes.get("name") ?? "";
    const classname = testcase.attributes.get("classname") ?? "";
    const problem = testcase.children.find((child) => child.name === "failure" || child.name === "error");
    const skipped = testcase.children.some((child) => child.name === "skipped");
    const said = problem === undefined ? "" : (problem.attributes.get("message") ?? problem.text).trim();
    return {
        title: classname === "" ? name : `${classname} › ${name}`,
        acs: criteriaPlanned(`${classname} ${name}`, planned),
        passed: problem === undefined && !skipped,
        ...(problem === undefined ? {} : { message: said.slice(0, messageKept) || problem.name }),
    };
};

/**
 * Reads the tests of one JUnit XML document, from bun test, Vitest, Playwright or any runner that writes
 * `testsuite` and `testcase` elements.
 * @param xml the document
 * @param planned the plan's acceptance tests, which say which test proves which criterion
 * @returns each test with the criteria the plan credits it with, or what is wrong with the document
 */
export const readJunit = (xml: string, planned: readonly PlannedTest[]): Result.Result<readonly JunitTest[], string> =>
    Result.flatMap(parseXml(xml), (root) =>
        root.name === "testsuites" || root.name === "testsuite"
            ? Result.succeed(testCasesIn(root).map((testcase) => testOf(testcase, planned)))
            : Result.fail(`the root element is <${root.name}>, not <testsuites> or <testsuite>`),
    );
