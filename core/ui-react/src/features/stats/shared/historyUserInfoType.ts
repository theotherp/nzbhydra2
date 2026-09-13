/**
 * `logging.historyUserInfoType` as the config reader every history/stats page
 * needs to decide whether to show the username and/or IP columns. Reads the
 * safe config defensively -- callers pass `useSafeConfig`'s possibly-`undefined`
 * result straight through -- and falls back to `"NONE"` for anything short of
 * a well-formed string.
 */
export function historyUserInfoType(safeConfig: unknown): string {
    if (!safeConfig || typeof safeConfig !== "object") {
        return "NONE";
    }
    const logging = (safeConfig as {logging?: unknown}).logging;
    return logging &&
        typeof logging === "object" &&
        typeof (logging as {historyUserInfoType?: unknown})
            .historyUserInfoType === "string"
        ? (logging as {historyUserInfoType: string}).historyUserInfoType
        : "NONE";
}
