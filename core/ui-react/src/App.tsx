// Vendored IBM Plex webfaces, imported as build-time CSS side effects so the
// fonts are served from this application's own build output. The mock's runtime
// `fonts.googleapis.com`/`fonts.gstatic.com` `<link>` tags are deliberately not
// adopted (ADR-0009). Weights match the mock's own Google Fonts request:
// IBM Plex Sans 400/500/600/700 and IBM Plex Mono 400/500.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import {CircularProgress, Container, Stack, Typography} from "@mui/material";
import {CssBaseline} from "@mui/material";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {
    MutationCache,
    QueryCache,
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {RouterProvider} from "@tanstack/react-router";
import {useState} from "react";

import {
    DEFAULT_QUERY_STALE_TIME_MS,
    REFETCH_ON_WINDOW_FOCUS,
    retryUnlessUnauthorized,
} from "./app/queryDefaults";
import {reportSessionError} from "./app/sessionExpiry";
import {SafeConfigProvider} from "./app/SafeConfigProvider";
import {ThemePreferenceProvider} from "./app/ThemePreferenceProvider";
import type {BootstrapData} from "./bootstrap";
import {DialogProvider} from "./components/dialogs/DialogProvider";
import {ToastProvider} from "./components/toasts/ToastProvider";
import {createAppRouter} from "./router";

type AppProps = {
    bootstrap: BootstrapData;
    isLoading?: boolean;
};

export function App({bootstrap, isLoading = false}: AppProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        refetchOnWindowFocus: REFETCH_ON_WINDOW_FOCUS,
                        retry: retryUnlessUnauthorized,
                        staleTime: DEFAULT_QUERY_STALE_TIME_MS,
                    },
                },
                /*
                 * FM-171 (`C-SESSION-EXPIRY`): every feature query and
                 * mutation in the application runs on this client, so its two
                 * caches are the one hook point that sees an expired session's
                 * 401 wherever it happens. `reportSessionError` ignores
                 * everything that is not an `UnauthorizedError` and coalesces
                 * the rest into one dialog.
                 *
                 * The caches rather than `ApiTransport`: the auth flows
                 * (`features/auth/session.ts`) call the transport directly and
                 * *deliberately* provoke 401s -- `askForPassword` exists to
                 * get one -- so a transport-level hook would raise "your
                 * session expired" during a login. Going through the caches
                 * excludes those call sites by construction, because they
                 * never traverse react-query.
                 */
                mutationCache: new MutationCache({
                    onError: (error) => reportSessionError(error),
                }),
                queryCache: new QueryCache({
                    onError: (error) => reportSessionError(error),
                }),
            }),
    );
    const [router] = useState(() => createAppRouter(bootstrap));

    return (
        /*
         * FM-154 (ADR-0049): the theme is no longer built here. It comes from
         * `ThemePreferenceProvider`, which owns the in-session preference the
         * shell's nav-bar selector writes and renders MUI's `ThemeProvider`
         * itself. Nothing moved relative to anything else -- the provider takes
         * exactly the position `ThemeProvider` held, outside `CssBaseline` and
         * outside `SafeConfigProvider` -- because the preference is a client
         * concern with no dependency on the query client or the server config.
         * FM-155 kept it here when it made the choice durable: the provider
         * builds its own transport from the bootstrap base URL rather than
         * sitting under the app's, so one GET and a PUT-per-click never
         * forced a provider reorder.
         */
        <ThemePreferenceProvider>
            {/* The single date-library binding for every MUI X picker in the
                application (ADR-0002's component set). It carries no theme:
                the calendar is stock MUI and takes the active palette from
                `ThemePreferenceProvider` above it. */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                {/* `enableColorScheme` writes `color-scheme: dark|light` from
                    the palette mode onto the document, which is what the
                    browser reads when it draws the controls we do not. FM-185
                    replaced the stats range and history refine time inputs --
                    the `e541f7a46` quickfix's original subject -- with MUI X
                    pickers that render their calendar in-page from the palette,
                    because Firefox draws a native `<input type="date">` panel at
                    browser level that no page-level `color-scheme` reaches
                    (owner report 2026-09-04). What still needs this flag is
                    every other browser-drawn surface: native scrollbars, form
                    controls we do not replace, and the `input type="number"`
                    spinners. */}
                <CssBaseline enableColorScheme />
                {isLoading ? (
                    <Container maxWidth="sm" sx={{py: 8}}>
                        <Stack
                            role="status"
                            spacing={2}
                            sx={{
                                alignItems: "center",
                            }}
                        >
                            <CircularProgress variant="indeterminate" />
                            <Typography>Loading…</Typography>
                        </Stack>
                    </Container>
                ) : (
                    <QueryClientProvider client={queryClient}>
                        <SafeConfigProvider bootstrap={bootstrap}>
                            <DialogProvider>
                                <ToastProvider>
                                    <RouterProvider router={router} />
                                </ToastProvider>
                            </DialogProvider>
                        </SafeConfigProvider>
                    </QueryClientProvider>
                )}
            </LocalizationProvider>
        </ThemePreferenceProvider>
    );
}
