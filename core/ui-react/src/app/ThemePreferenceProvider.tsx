import {ThemeProvider} from "@mui/material/styles";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";

import {
    createDefaultThemePreferenceService,
    readCachedThemePreference,
    writeCachedThemePreference,
    type ThemePreferenceService,
} from "../services/theme/themePreference";
import {createHydraTheme, type ThemePreference} from "./theme";

/**
 * FM-154 (ADR-0049): the application's theme preference, and the MUI theme
 * built from it.
 *
 * Before this module `App.tsx` called `createHydraTheme("dark")` inline, so the
 * palette was decided once at mount and could not change without a reload. The
 * preference lives in state at the top of the tree, the theme is recreated from
 * it, and the nav-bar selector in `AppShell` writes it.
 *
 * FM-155 made that choice durable per user, and it is a change to this file and
 * to `C-THEME-PREFERENCE` only, exactly as FM-154 predicted: the setter behind
 * this context now also writes the server record and the local seed cache, and
 * the initial value comes from those two sources instead of from a constant.
 */
type ThemePreferenceContextValue = {
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext =
    createContext<ThemePreferenceContextValue | null>(null);

/**
 * `prefers-color-scheme`, as a subscribable value rather than a one-shot read.
 *
 * ADR-0049's `auto` has to follow the operating system *while the page is
 * open*, so the media query is subscribed to rather than sampled at mount.
 * `useSyncExternalStore` is the mechanism for exactly this shape -- an external
 * store React does not own -- and it gives the server/prerender snapshot for
 * free.
 *
 * Both guards are load-bearing rather than defensive: jsdom implements neither
 * `matchMedia` nor `MediaQueryList`, so every component test in this repository
 * that mounts the application would throw here without them (this is the same
 * guard `theme.ts`'s own `systemPrefersDark` carries, for the same reason), and
 * Safari below 14 exposes `MediaQueryList` without `addEventListener`.
 */
const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function darkSchemeQuery(): MediaQueryList | null {
    return typeof window !== "undefined" &&
        typeof window.matchMedia === "function"
        ? window.matchMedia(DARK_SCHEME_QUERY)
        : null;
}

function subscribeToDarkScheme(onChange: () => void): () => void {
    const query = darkSchemeQuery();
    if (query === null) {
        return () => undefined;
    }
    if (typeof query.addEventListener === "function") {
        query.addEventListener("change", onChange);
        return () => query.removeEventListener("change", onChange);
    }
    query.addListener(onChange);
    return () => query.removeListener(onChange);
}

function usePrefersDark(): boolean {
    return useSyncExternalStore(
        subscribeToDarkScheme,
        () => darkSchemeQuery()?.matches === true,
        () => false,
    );
}

/**
 * Owns the theme preference and provides the theme built from it.
 *
 * It renders MUI's `ThemeProvider` itself rather than exposing a theme for
 * `App.tsx` to wrap: the preference and the theme are one thing, and splitting
 * them would let a future caller read the preference without being under the
 * matching theme. It therefore sits *outside* every other provider, above
 * `CssBaseline` -- which is where `ThemeProvider` already sat, so no provider
 * moved relative to another; only the theme's source did.
 */
export function ThemePreferenceProvider({
    children,
    initialPreference = "grey",
    service,
}: {
    children: React.ReactNode;
    /** The preference a session with nothing stored anywhere starts from. */
    initialPreference?: ThemePreference;
    /**
     * The stored preference. Defaults to the per-user record over
     * `C-SERVER-PREFERENCES`, and is `undefined` in a document with no
     * bootstrap -- which is how a component test mounts this provider without
     * reaching for the network.
     */
    service?: ThemePreferenceService;
}) {
    // The synchronous half of the startup path: the last preference this
    // browser applied, so the first paint is usually already the right theme
    // instead of flashing the default until the server answers. It is a cache
    // and not the source of truth, so an absent or malformed value simply
    // leaves the default standing.
    const [preference, setPreference] = useState<ThemePreference>(
        () => readCachedThemePreference() ?? initialPreference,
    );
    const persistence = useMemo(
        () => service ?? createDefaultThemePreferenceService(),
        [service],
    );
    // Whether the user has chosen a theme in this session. A choice made while
    // the startup read is still in flight must win over the value that read
    // returns -- otherwise the server's answer would silently undo a click.
    const chosen = useRef(false);
    const prefersDark = usePrefersDark();

    useEffect(() => {
        if (persistence === undefined) {
            return;
        }
        let cancelled = false;
        // `read` resolves `undefined` rather than rejecting for every failure
        // (see `C-THEME-PREFERENCE`), so there is no rejection to handle here.
        void persistence.read().then((stored) => {
            if (cancelled || chosen.current || stored === undefined) {
                return;
            }
            setPreference(stored);
            writeCachedThemePreference(stored);
        });
        return () => {
            cancelled = true;
        };
    }, [persistence]);
    // Recreating a MUI theme is not free (it augments every palette role), so
    // it is memoised on the two inputs that decide it. `prefersDark` is only
    // one of them while `auto` is selected, but `createHydraTheme` already
    // ignores it otherwise, so no branch is needed here.
    const theme = useMemo(
        () => createHydraTheme(preference, prefersDark),
        [preference, prefersDark],
    );
    const change = useCallback(
        (next: ThemePreference) => {
            chosen.current = true;
            // Applied first, and applied whatever the two stores do with it: a
            // theme the user can see change is the feature, and persistence is
            // the convenience around it. A rejected write therefore leaves the
            // chosen theme in place and says nothing -- this provider sits
            // above `ToastProvider` (it must, because it provides the theme the
            // toast renders in), so it has no way to surface a message here
            // even if a failed preference write deserved one.
            setPreference(next);
            writeCachedThemePreference(next);
            void persistence?.write(next).catch(() => undefined);
        },
        [persistence],
    );
    const value = useMemo(
        () => ({preference, setPreference: change}),
        [preference, change],
    );

    return (
        <ThemePreferenceContext.Provider value={value}>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </ThemePreferenceContext.Provider>
    );
}

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
