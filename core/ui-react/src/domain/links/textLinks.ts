import {externalLink} from "./externalLinks";

/**
 * `C-EXTERNAL-LINKS`, text side: turn server-supplied plain text into inert
 * text plus safe links, without ever trusting it as markup.
 *
 * Legacy renders notification bodies through `ng-bind-html`
 * (`notification-history-controller.js#formatEventBody`, which only replaces the
 * *first* `\n` with a `<br>`), so any markup a notification template or an
 * indexer message carries is interpreted by the browser. React renders these
 * segments as text nodes and anchors instead: markup stays visible as
 * characters, line breaks become real lines, and only `http`/`https` URLs
 * become links -- an `href` is never taken from the text verbatim, it is always
 * produced by `externalLink`, which rejects every other scheme
 * (`javascript:`, `data:`, …) and applies the configured dereferer.
 */

export type LinkedTextSegment = {
    text: string;
    /** Set only for a safe, dereferer-transformed `http(s)` link. */
    href?: string;
};

/**
 * Only absolute `http`/`https` runs are candidates. Commas end a candidate
 * because the notification `urls` column is a comma-separated Apprise URL list;
 * quotes and angle brackets end one so a URL embedded in markup-looking text
 * cannot swallow the rest of the line.
 */
const URL_CANDIDATE = /https?:\/\/[^\s<>"',]+/gi;

/** Sentence punctuation that follows a URL far more often than it belongs to it. */
const TRAILING_PUNCTUATION = /[.,;:!?'"]+$/;

/**
 * The text split into lines, each line split into segments. Callers render one
 * block per line, so a body's line breaks survive without `white-space` tricks
 * or any HTML interpretation.
 */
export function linkedTextLines(
    value: string,
    dereferer: unknown,
): LinkedTextSegment[][] {
    return value
        .split(/\r\n|\r|\n/)
        .map((line) => linkedTextSegments(line, dereferer));
}

export function linkedTextSegments(
    value: string,
    dereferer: unknown,
): LinkedTextSegment[] {
    const segments: LinkedTextSegment[] = [];
    let index = 0;
    for (const match of value.matchAll(URL_CANDIDATE)) {
        const start = match.index;
        const candidate = trimTrailingPunctuation(match[0]);
        const href = externalLink(candidate, dereferer);
        pushText(segments, value.slice(index, start));
        if (href) {
            segments.push({text: candidate, href});
        } else {
            pushText(segments, candidate);
        }
        index = start + candidate.length;
    }
    pushText(segments, value.slice(index));
    return segments;
}

function trimTrailingPunctuation(candidate: string): string {
    let trimmed = candidate.replace(TRAILING_PUNCTUATION, "");
    // A trailing closing parenthesis belongs to the URL only if the URL opened
    // it itself; an unbalanced one closes the sentence around it.
    while (trimmed.endsWith(")") && !balancedParentheses(trimmed)) {
        trimmed = trimmed.slice(0, -1).replace(TRAILING_PUNCTUATION, "");
    }
    return trimmed;
}

function balancedParentheses(value: string): boolean {
    return occurrences(value, "(") >= occurrences(value, ")");
}

function occurrences(value: string, character: string): number {
    let count = 0;
    for (const found of value) {
        if (found === character) count++;
    }
    return count;
}

function pushText(segments: LinkedTextSegment[], text: string): void {
    if (!text) return;
    const previous = segments.at(-1);
    if (previous && previous.href === undefined) {
        previous.text += text;
        return;
    }
    segments.push({text});
}
