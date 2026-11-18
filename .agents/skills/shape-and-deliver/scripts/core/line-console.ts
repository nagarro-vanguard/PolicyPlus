import type { Console } from "effect";

/**
 * A console that sends each line printed by `log`, `info`, `debug`, `error`, `warn` and `trace` to `write`, and does
 * nothing for assertions, grouping, tables, timing and counting. A step's progress then reaches only where the caller
 * sends it.
 * @param write where each line goes
 * @returns the console
 */
export const lineConsole = (write: (line: string) => void): Console.Console => {
    const line = (...args: readonly unknown[]) => write(args.map(String).join(" "));
    const nothing = () => undefined;
    return {
        assert: nothing,
        clear: nothing,
        count: nothing,
        countReset: nothing,
        debug: line,
        dir: nothing,
        dirxml: nothing,
        error: line,
        group: nothing,
        groupCollapsed: nothing,
        groupEnd: nothing,
        info: line,
        log: line,
        table: nothing,
        time: nothing,
        timeEnd: nothing,
        timeLog: nothing,
        trace: line,
        warn: line,
    };
};
