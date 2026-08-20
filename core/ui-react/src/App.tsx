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
import {CssBaseline, ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {RouterProvider} from "@tanstack/react-router";
import {useState} from "react";

import {SafeConfigProvider} from "./app/SafeConfigProvider";
import {createHydraTheme} from "./app/theme";
import type {BootstrapData} from "./bootstrap";
import {DialogProvider} from "./components/dialogs/DialogProvider";
import {ToastProvider} from "./components/toasts/ToastProvider";
import {createAppRouter} from "./router";

type AppProps = {
    bootstrap: BootstrapData;
    isLoading?: boolean;
};

export function App({bootstrap, isLoading = false}: AppProps) {
    const [queryClient] = useState(() => new QueryClient());
    const [router] = useState(() => createAppRouter(bootstrap));

    return (
        <ThemeProvider theme={createHydraTheme("dark")}>
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
        </ThemeProvider>
    );
}
