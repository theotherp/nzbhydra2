import {CircularProgress, Container, Stack, Typography} from "@mui/material";
import {CssBaseline, ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {RouterProvider} from "@tanstack/react-router";
import {useState} from "react";

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
        <ThemeProvider theme={createHydraTheme()}>
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
                    <DialogProvider>
                        <ToastProvider>
                            <RouterProvider router={router} />
                        </ToastProvider>
                    </DialogProvider>
                </QueryClientProvider>
            )}
        </ThemeProvider>
    );
}
