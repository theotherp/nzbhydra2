import {createContext, useContext} from "react";

import type {ThemePreference} from "./theme";

type ThemePreferenceContextValue = {
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
};

export const ThemePreferenceContext =
    createContext<ThemePreferenceContextValue | null>(null);

/**
 * The current preference and the setter that changes it.
 *
 * Throws outside the provider rather than falling back to a default: a theme
 * selector that silently does nothing is worse than one that fails loudly in a
 * test.
 */
export function useThemePreference(): ThemePreferenceContextValue {
    const value = useContext(ThemePreferenceContext);
    if (value === null) {
        throw new Error(
            "useThemePreference must be used inside a ThemePreferenceProvider",
        );
    }
    return value;
}
