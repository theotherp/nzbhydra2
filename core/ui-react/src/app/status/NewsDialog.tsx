import {
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from "@mui/material";

import type {NewsEntry} from "../../api/news";
import {SafeRichContent} from "../../components/content/SafeRichContent";

/**
 * Legacy's `news-modal.html`: every news entry for the running version in one
 * dialog, each under its version heading. The entries are server-authored HTML
 * and go through `C-SAFE-RICH-CONTENT`'s news boundary.
 */
export function NewsDialog({
    entries,
    onClose,
}: {
    entries: NewsEntry[];
    onClose: () => void;
}) {
    return (
        <Dialog
            aria-labelledby="hydra-news-title"
            data-testid="news-dialog"
            fullWidth
            maxWidth="md"
            onClose={onClose}
            open
        >
            <DialogTitle id="hydra-news-title">News</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    {entries.map((entry, index) => (
                        <Card key={`${entry.version}-${index}`}>
                            <CardContent>
                                <Typography component="h2" variant="h6">
                                    {entry.version}
                                </Typography>
                                <SafeRichContent html={entry.news} />
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose} variant="contained">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
