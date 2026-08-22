import {Alert, Button, Stack, Typography} from "@mui/material";

/**
 * `F-PLATFORM-LIVE-STATUS`' automatic-update notice (legacy
 * `checks-footer.html`'s `automaticUpdateToNotice && showWhatsNewBanner`
 * block): shown once for the version an automatic update installed, until
 * dismissed. The dismiss control is `Alert`'s own built-in close affordance
 * (`onClose`), the same pattern `C-TOAST-SERVICE`'s `ToastProvider` already
 * uses for its Snackbar alert.
 */
export function AutomaticUpdateNotice({
    onDismiss,
    onShowChangelog,
}: {
    onDismiss: () => void;
    onShowChangelog: () => void;
}) {
    return (
        <Alert
            data-testid="automatic-update-footer"
            onClose={onDismiss}
            severity="info"
            square
        >
            <Stack
                alignItems="center"
                direction="row"
                flexWrap="wrap"
                spacing={2}
            >
                <Typography>An update was automatically installed.</Typography>
                <Button
                    onClick={onShowChangelog}
                    type="button"
                    variant="outlined"
                >
                    See what&apos;s new!
                </Button>
            </Stack>
        </Alert>
    );
}
