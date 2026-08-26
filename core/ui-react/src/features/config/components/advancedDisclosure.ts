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
