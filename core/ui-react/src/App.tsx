import {Button, Container, Stack, Typography} from "@mui/material";

import type {BootstrapData} from "./bootstrap";

type AppProps = {
    bootstrap: BootstrapData;
};

export function App({bootstrap}: AppProps) {
    const legacyUrl = legacySwitchUrl(bootstrap.baseUrl);

    return (
        <Container component="main" maxWidth="sm" sx={{py: 8}}>
            <Stack spacing={3}>
                <Typography component="h1" variant="h4">
                    NZBHydra2
                </Typography>
                <Typography>React migration placeholder</Typography>
                <Button component="a" href={legacyUrl} variant="contained">
                    Switch to legacy UI
                </Button>
            </Stack>
        </Container>
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
