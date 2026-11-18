import { isAbsolute, relative, resolve } from "node:path";

/**
 * Tells whether a text is one plain folder or file name: no separator, not `.` or `..`, and no control character. A
 * name like that cannot lead a path out of the folder it is joined to.
 * @param name the text, such as a story's number or a layer's name
 * @returns true when it is a plain name
 */
export const isPlainName = (name: string): boolean =>
    name.length > 0 &&
    name !== "." &&
    name !== ".." &&
    ![...name].some((char) => char === "/" || char === "\\" || char.charCodeAt(0) < 32);

/**
 * Tells whether a path, joined to a folder, stays inside it.
 * @param folder the folder
 * @param path a path relative to the folder
 * @returns true when the path is not absolute and does not climb out of the folder
 */
export const staysInside = (folder: string, path: string): boolean => {
    const out = relative(resolve(folder), resolve(folder, path));
    return !isAbsolute(path) && out !== ".." && !out.startsWith("../") && !isAbsolute(out);
};

/**
 * Tells whether a path names something inside a codebase's work tree and not the tree itself or git's own folder: a
 * relative path, with no `.` or `..` part, no `.git` part, and no trailing slash that makes it a directory.
 * @param path the path relative to the codebase root
 * @returns true when the path may name a file
 */
export const isFilePathInside = (path: string): boolean => {
    const parts = path.split("/");
    return (
        path.length > 0 &&
        !path.startsWith("/") &&
        !path.includes("\\") &&
        parts.every((part) => part.length > 0 && part !== "." && part !== ".." && part.toLowerCase() !== ".git")
    );
};
