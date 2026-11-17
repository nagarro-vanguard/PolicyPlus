import { basename, extname } from "node:path";

/**
 * A file's extension as the stack profile and the file summary name it: in lower case, or, for a file with none,
 * which kind of file it is.
 * @param path the file's path
 * @returns the extension, such as `.php`, or `(none: dotfile)` / `(none: no extension)`
 */
export const extensionOf = (path: string) =>
    extname(path).toLowerCase() || `(none: ${basename(path).includes(".") ? "dotfile" : "no extension"})`;
