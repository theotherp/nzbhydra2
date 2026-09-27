import {useEffect} from "react";

/** What `templates/react.html` ships as the page title. */
export const BASE_DOCUMENT_TITLE = "NZBHydra 2";

/**
 * The browser tab's title for a page: the application name followed by the
 * page's section and, where it has one, its tab or subject, e.g.
 * "NZBHydra 2 - Config - Searching". Blank parts are left out.
 */
export function documentTitle(...parts: (string | undefined)[]): string {
    return [BASE_DOCUMENT_TITLE, ...parts]
        .map((part) => part?.trim())
        .filter((part): part is string => Boolean(part))
        .join(" - ");
}

/**
 * Sets the document title while the calling page is mounted. Unmounting puts
 * the plain application name back; React runs a leaving page's cleanup before
 * the arriving page's effect, so the arriving page's title is the one that
 * stays, and a page that sets none (the not-found notice) shows the plain name
 * rather than a stale one.
 */
export function useDocumentTitle(...parts: (string | undefined)[]): void {
    const title = documentTitle(...parts);
    useEffect(() => {
        document.title = title;
        return () => {
            document.title = BASE_DOCUMENT_TITLE;
        };
    }, [title]);
}
