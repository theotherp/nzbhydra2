import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from "@mui/material";

import type {UserNewsEntry} from "../../api/news";
import {SafeRichContent} from "../../components/content/SafeRichContent";

/**
 * Legacy's `user-news-modal.html`: one personally addressed notice, whose body
 * is server-authored HTML rendered through `C-SAFE-RICH-CONTENT`'s news
 * boundary. Closing it dismisses it (`API-USER-NEWS-DISMISS`) before the next
 * notice opens.
 */
export function UserNewsDialog({
    entry,
    onClose,
}: {
    entry: UserNewsEntry;
    onClose: () => void;
}) {
    return (
        <Dialog
            aria-labelledby="hydra-user-news-title"
            data-testid="user-news-dialog"
            fullWidth
            maxWidth="md"
            onClose={onClose}
            open
        >
            <DialogTitle id="hydra-user-news-title">{entry.title}</DialogTitle>
            <DialogContent dividers>
                <SafeRichContent html={entry.newsAsHtml} />
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose} variant="contained">
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
}
