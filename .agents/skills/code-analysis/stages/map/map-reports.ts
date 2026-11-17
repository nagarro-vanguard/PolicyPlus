import { Effect } from "effect";
import { mapReportReads } from "../../shared/read/map-reports";
import { compareText } from "../../shared/run/collections";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { jsonlText } from "../../shared/run/json-files";
import { FileAccess } from "../../shared/source/file-access";
import { RecordStore } from "../../shared/store/database";
import type { BlockNameRow, ExternalNameLinkRow, RepeatedCopyRow } from "../../shared/store/rows";

type Place = { readonly file: string; readonly firstLine: number; readonly lastLine: number };

const callSitesKept = 5;

const namesShown = 3;

/**
 * The names defined by blocks in two or more files, each with every copy: blocks of one name and one container, by the
 * names as written in lower case. It chooses no copy and claims none is the same as another; it only lists them.
 * @param rows one row per copy of each repeated name
 * @returns the repeated names, the most lines first
 */
const repeatedDefinitions = (rows: ReadonlyArray<typeof RepeatedCopyRow.Type>) => {
    const groups = new Map<string, { name: string; container: string; copies: Place[] }>();
    for (const row of rows) {
        const key = `${row.name}\u0000${row.container}`;
        const place = { file: row.file, firstLine: row.firstLine, lastLine: row.lastLine };
        const held = groups.get(key);
        if (held === undefined) {
            groups.set(key, { name: row.name, container: row.container, copies: [place] });
        } else {
            held.copies.push(place);
        }
    }
    return [...groups.values()]
        .map((group) => ({
            ...group,
            lines: group.copies.reduce((sum, copy) => sum + copy.lastLine - copy.firstLine + 1, 0),
        }))
        .toSorted((left, right) => right.lines - left.lines || compareText(left.name, right.name));
};

/**
 * The external resources whose names a block in scope also carries: each with the links that use it, a few call sites,
 * and the definitions found. A link to such a name should name a line inside each definition; this only lists them.
 * @param links each link to an external system whose resource is the name of some block
 * @param blocks each block those names belong to
 * @returns one entry per system and resource
 */
const namesDefinedInScope = (
    links: ReadonlyArray<typeof ExternalNameLinkRow.Type>,
    blocks: ReadonlyArray<typeof BlockNameRow.Type>,
) => {
    const definitions = new Map<string, Place[]>();
    for (const block of blocks) {
        const place = { file: block.file, firstLine: block.firstLine, lastLine: block.lastLine };
        const held = definitions.get(block.name);
        if (held === undefined) {
            definitions.set(block.name, [place]);
        } else {
            held.push(place);
        }
    }
    const found = new Map<
        string,
        { system: string; resource: string; links: number; callSites: { file: string; line: number }[] }
    >();
    for (const link of links) {
        const key = `${link.system}\u0000${link.resource}`;
        const site = { file: link.file, line: link.line };
        const held = found.get(key);
        if (held === undefined) {
            found.set(key, { system: link.system, resource: link.resource, links: 1, callSites: [site] });
        } else {
            held.links += 1;
            if (held.callSites.length < callSitesKept) {
                held.callSites.push(site);
            }
        }
    }
    return [...found.values()].map((entry) => {
        const own = definitions.get(entry.resource.toLowerCase());
        return { ...entry, definitions: own === undefined ? [] : own };
    });
};

/**
 * The Map's reports once its records are written, each a highlight and none a refusal: the names that blocks define in
 * more than one file, and the names external links use that a block in scope defines, so a link that should name a place
 * and names a system shows. Each full list is written beside the Map's work.
 * @param root the analysis root
 * @returns the lines to tell the person
 */
export const mapReports = Effect.fnUntraced(function* (root: string) {
    const reads = mapReportReads(yield* RecordStore);
    const paths = analysisPaths(root);
    const fs = yield* FileAccess;
    const repeated = repeatedDefinitions(yield* reads.repeatedCopies);
    const named = namesDefinedInScope(yield* reads.externalLinksNamingBlocks, yield* reads.blocksNamedByExternalLinks);
    yield* fs.writeText(paths.mapRepeatedDefinitions, jsonlText(repeated));
    yield* fs.writeText(paths.mapNamesDefinedInScope, jsonlText(named));
    const repeatedLine = repeated.length
        ? `${repeated.length} names are defined in more than one file (${repeated.reduce((sum, each) => sum + each.copies.length, 0)} blocks, ${repeated.reduce((sum, each) => sum + each.lines, 0)} lines), the largest ${repeated
              .slice(0, namesShown)
              .map((each) => each.name)
              .join(
                  ", ",
              )}; every copy is read for rules, and to leave a file's copies out, list the file under Leave Out in the request; the list is in ${paths.mapRepeatedDefinitions}`
        : "no name is defined in more than one file";
    const first = named.at(0);
    const namedLine =
        first !== undefined
            ? `${named.length} names that external links use are defined as blocks in scope (${named.reduce((sum, each) => sum + each.links, 0)} links), such as ${first.resource}: a link to code in scope names a line inside each definition; the list is in ${paths.mapNamesDefinedInScope}`
            : "no external link names a block defined in scope";
    return [repeatedLine, namedLine];
});
