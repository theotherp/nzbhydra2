import {createContext, useContext} from "react";

/**
 * `C-CONFIG-FIELDS`: the channel between a `ConfigFieldset` and the advanced
 * `SettingRow`s inside it, so a fieldset can say how many advanced settings the
 * global toggle is hiding from it and reveal them on demand.
 *
 * A hidden row registers itself here for as long as it is mounted instead of
 * the fieldset counting its own `children`: a row's `advanced` flag is a prop of
 * a control kind nested arbitrarily deep in a tab's JSX (often behind a
 * `useWatch` condition, e.g. the Apprise URL row), so it is not readable from
 * the fieldset's element tree, and rows come and go while the tab is open. The
 * fieldset therefore holds the registrations in state and derives the count from
 * them on every render — never memoized, because a conditional row unmounting is
 * exactly the churn the count has to follow.
 */
export type AdvancedDisclosure = {
    /**
     * Called by an advanced row while the global toggle hides it; the returned
     * function withdraws the registration when the row unmounts. `key` is the
     * row's config path, which is unique within a fieldset, but registrations
     * are counted rather than deduplicated so a double-invoked effect (React
     * strict mode) and a repeated path both settle at the right number.
     */
    registerHiddenAdvancedRow: (key: string) => () => void;
    /** Whether the nearest fieldset's advanced expander is expanded. */
    revealed: boolean;
};

const noop = () => {};

/**
 * What an advanced row outside any fieldset sees: nobody is counting it and
 * nothing can reveal it, so it stays hidden exactly as it was before FM-098.
 * That is the documented boundary of this feature, not a gap.
 */
export const NO_ADVANCED_DISCLOSURE: AdvancedDisclosure = {
    registerHiddenAdvancedRow: () => noop,
    revealed: false,
};

/**
 * What the rows of an *advanced fieldset* see once that fieldset's own expander
 * is open: revealing a whole advanced block reveals everything in it at once, so
 * its rows neither register nor produce a second expander inside the first.
 */
export const FULLY_REVEALED_ADVANCED_DISCLOSURE: AdvancedDisclosure = {
    registerHiddenAdvancedRow: () => noop,
    revealed: true,
};

export const AdvancedDisclosureContext = createContext(NO_ADVANCED_DISCLOSURE);

export function useAdvancedDisclosure(): AdvancedDisclosure {
    return useContext(AdvancedDisclosureContext);
}

/**
 * FM-099: the programmatic side of the same disclosure. A settings-search hit
 * on an advanced row is behind whichever expander FM-098 gave its fieldset —
 * the per-fieldset "N advanced settings hidden" one, or the whole-fieldset one
 * — and both are the *same* piece of `ConfigFieldset` state, so one request
 * naming the fieldset drives either shape.
 *
 * A request, not a command: it asks the fieldset with this label to open, and
 * only that fieldset decides. Nothing here reads or writes the global advanced
 * toggle, whose stored preference must survive a search untouched — revealing
 * is a momentary "show me that one thing", exactly as expanding by hand is.
 */
export type AdvancedRevealRequest = {
    /** Label of the fieldset asked to reveal, or `null` for no request. */
    fieldset: string | null;
    /**
     * Bumped on every request. Searching for the same setting twice must
     * reveal twice — after the admin collapsed it in between — and without a
     * changing token the second request would be an identical value that no
     * effect re-runs for.
     */
    token: number;
};

export const NO_ADVANCED_REVEAL_REQUEST: AdvancedRevealRequest = {
    fieldset: null,
    token: 0,
};

export const AdvancedRevealRequestContext = createContext(
    NO_ADVANCED_REVEAL_REQUEST,
);

export function useAdvancedRevealRequest(): AdvancedRevealRequest {
    return useContext(AdvancedRevealRequestContext);
}

/**
 * Whether a request names this fieldset. Compared case-insensitively because a
 * fieldset's identity in a selector is already its lowercased label
 * (`fieldsetTestId`), so the two spellings must not be able to disagree.
 */
export function revealRequestMatches(
    request: AdvancedRevealRequest,
    label: string,
): boolean {
    return (
        request.fieldset !== null &&
        request.fieldset.toLowerCase() === label.toLowerCase()
    );
}
