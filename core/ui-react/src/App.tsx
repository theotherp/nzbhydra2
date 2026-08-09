import {
    Button,
    CircularProgress,
    Container,
    Stack,
    Typography,
} from "@mui/material";
import {CssBaseline, ThemeProvider} from "@mui/material";

import {AppShell} from "./app/AppShell";
import {createHydraTheme} from "./app/theme";
import type {BootstrapData} from "./bootstrap";
import {DialogProvider} from "./components/dialogs/DialogProvider";
import {ToastProvider} from "./components/toasts/ToastProvider";

type AppProps = {
    bootstrap: BootstrapData;
    isLoading?: boolean;
};

export function App({bootstrap, isLoading = false}: AppProps) {
    const legacyUrl = legacySwitchUrl(bootstrap.baseUrl);

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
                <DialogProvider>
                    <ToastProvider>
                        <AppShell bootstrap={bootstrap}>
                            <Container maxWidth="sm" sx={{py: 8}}>
                                <Stack spacing={3}>
                                    <Typography component="h1" variant="h4">
                                        React migration placeholder
                                    </Typography>
                                    <Typography>
                                        This route has not yet been migrated to
                                        React.
                                    </Typography>
                                    <Button
                                        component="a"
                                        href={legacyUrl}
                                        variant="contained"
                                    >
                                        Switch to legacy UI
                                    </Button>
                                </Stack>
                            </Container>
                        </AppShell>
                    </ToastProvider>
                </DialogProvider>
            )}
        </ThemeProvider>
    );
}

function legacySwitchUrl(baseUrl: string): string {
    const base = new URL(baseUrl, window.location.origin);
    const currentPath = window.location.pathname.startsWith(base.pathname)
        ? window.location.pathname.slice(base.pathname.length - 1)
        : window.location.pathname;
    const selector = new URL("ui/legacy", base);
    selector.searchParams.set("redirect", currentPath + window.location.search);
    return selector.toString();
}
