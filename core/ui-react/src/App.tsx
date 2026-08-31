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
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {RouterProvider} from "@tanstack/react-router";
import {useState} from "react";

import {
    DEFAULT_QUERY_STALE_TIME_MS,
    REFETCH_ON_WINDOW_FOCUS,
} from "./app/queryDefaults";
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
                        staleTime: DEFAULT_QUERY_STALE_TIME_MS,
                    },
                },
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
            <CssBaseline />
            {isLoading ? (
                <Container maxWidth="sm" sx={{py: 8}}>
                    <Stack alignItems="center" role="status" spacing={2}>
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
        </ThemePreferenceProvider>
    );
}
