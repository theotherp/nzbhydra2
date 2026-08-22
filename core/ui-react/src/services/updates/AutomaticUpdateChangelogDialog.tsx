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

import {getAutomaticUpdateHistory} from "../../api/system/updates";
import {ApiTransport} from "../../api/transport";
import {ChangelogEntries} from "./ChangelogEntries";

/**
 * The automatic-update footer notice's own "See what's new" dialog
 * (`hydra-checks-footer.js:163-167`): unlike `ChangelogDialog`, which asks for
 * the changes since a given version, this one always answers
 * `API-UPDATES-AUTOMATIC-HISTORY` -- the changes the automatic update itself
 * installed.
 */
export function AutomaticUpdateChangelogDialog({
    onClose,
    open,
    transport,
}: {
    onClose: () => void;
    open: boolean;
    transport: ApiTransport;
}) {
    const history = useQuery({
        enabled: open,
        queryFn: () => getAutomaticUpdateHistory(transport),
        queryKey: ["update-automatic-history"],
    });

    return (
        <Dialog
            aria-labelledby="hydra-automatic-changelog-title"
            data-testid="automatic-update-footer-changelog-dialog"
            fullWidth
            maxWidth="md"
            onClose={onClose}
            open={open}
        >
            <DialogTitle id="hydra-automatic-changelog-title">
                Change log
            </DialogTitle>
            <DialogContent dividers>
                {history.isPending && (
                    <Stack alignItems="center" role="status" sx={{py: 2}}>
                        <CircularProgress variant="indeterminate" />
                    </Stack>
                )}
                {history.isError && (
                    <Alert severity="error">
                        Unable to load the change log.
                    </Alert>
                )}
                {history.isSuccess && (
                    <ChangelogEntries entries={history.data} />
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
