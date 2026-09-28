import type {HasNfo} from "../../../api/search";

/**
 * Legacy's Binsearch query (`core/ui-src/js/nzbhydra.js:865-868`), built from
 * the result's `source` (the usenet poster) and kept byte-for-byte, including
 * its plain-`http` scheme and its empty `server` parameter.
 */
export function binsearchUrl(source: string): string {
    return `http://binsearch.info/?q=${encodeURIComponent(source)}&max=100&adv_age=3000&server=`;
}

/** `search-result.js:186-193`, one tooltip per `hasNfo` state. */
export function nfoTooltip(hasNfo: HasNfo | undefined): string {
    if (hasNfo === "YES") {
        return "Show NFO";
    }
    if (hasNfo === "MAYBE") {
        return "Try to load NFO (may not be available)";
    }
    return "No NFO available";
}
