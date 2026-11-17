import type { Lines } from "../../shared/model/shared-fields";

/**
 * Whether lines start inside one of the job's windows: every record is written by the job its first line falls in.
 * @param windows the job's windows
 * @param lines the record's lines
 * @returns true when its first line is the job's
 */
export const startsIn = (windows: readonly Lines[], lines: Lines) =>
    windows.some(
        (window) =>
            window.file === lines.file && window.firstLine <= lines.firstLine && lines.firstLine <= window.lastLine,
    );
