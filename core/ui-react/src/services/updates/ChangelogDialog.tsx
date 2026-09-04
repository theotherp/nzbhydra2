import {
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
} from "@mui/material";
import {useQuery} from "@tanstack/react-query";

import {getChangesSince} from "../../api/system/updates";
import {ApiTransport} from "../../api/transport";
import {ChangelogEntries} from "./ChangelogEntries";

/**
 * `C-UPDATE-COORDINATOR`'s "See what's new" dialog (legacy
 * `changelog-modal.html`): the changes between the running version and
 * `version`, fetched when the dialog opens.
 */
export function ChangelogDialog({
    onClose,
    transport,
    version,
}: {
    onClose: () => void;
    transport: ApiTransport;
    /** `null` keeps the dialog closed and its request unsent. */
    version: string | null;
}) {
    const changes = useQuery({
        enabled: version !== null,
        queryFn: () => getChangesSince(transport, version as string),
        queryKey: ["update-changes", version],
    });

    return (
        <Dialog
            aria-labelledby="hydra-changelog-title"
            data-testid="system-updates-changelog-dialog"
            fullWidth
            maxWidth="md"
            onClose={onClose}
            open={version !== null}
        >
            <DialogTitle id="hydra-changelog-title">Change log</DialogTitle>
            <DialogContent dividers>
                {changes.isPending && (
                    <Stack
                        role="status"
                        sx={{
                            alignItems: "center",
                            py: 2,
                        }}
                    >
                        <CircularProgress variant="indeterminate" />
                    </Stack>
                )}
                {changes.isError && (
                    <Alert severity="error">
                        Unable to load the change log.
                    </Alert>
                )}
                {changes.isSuccess && (
                    <ChangelogEntries entries={changes.data} />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} type="button" variant="contained">
                    Great!
                </Button>
            </DialogActions>
        </Dialog>
    );
}
