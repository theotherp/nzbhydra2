import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
} from "@mui/material";

/**
 * The category a single row's send goes to, asked for exactly when the
 * downloader has no configured default (`SendToDownloaderButtons`).
 *
 * Legacy's `addable-nzb-modal.html`, rebuilt: a "No category" button followed
 * by the downloader's own categories, and a click both chooses and sends.
 * There is deliberately no confirm step -- picking the category *is* the
 * confirmation, which is what made the legacy modal cheap enough to live on
 * the path of every row download.
 *
 * The categories keep the order the downloader reports them in, which is what
 * the bulk bar's `Select` renders too (`DownloadActions`). Legacy sorted them
 * here (`downloader-categories-service.js:83`) and nowhere else; one order
 * across the two places a category is offered is worth more than that.
 *
 * A feature-owned MUI `Dialog` rather than `C-DIALOG-SERVICE.confirm`, for the
 * reason `NfoDialog` gives: that service models a message with up to three
 * fixed answers, and this is a list of n answers that is only known once the
 * downloader has been asked.
 */
export function SendCategoryDialog({
    categories,
    downloaderName,
    onCancel,
    onPick,
    open,
}: {
    /** The downloader's categories, in the order it reports them. */
    categories: string[];
    /** Named in the title, because a row can offer several downloaders. */
    downloaderName: string;
    onCancel: () => void;
    /** `null` is legacy's "No category": send without one. */
    onPick: (category: string | null) => void;
    open: boolean;
}) {
    return (
        <Dialog
            aria-labelledby="send-category-dialog-title"
            data-testid="send-category-dialog"
            maxWidth="xs"
            onClose={onCancel}
            open={open}
        >
            <DialogTitle id="send-category-dialog-title">
                Send to {downloaderName}
            </DialogTitle>
            <DialogContent dividers>
                <Stack
                    direction="row"
                    sx={{flexWrap: "wrap", gap: 1}}
                    useFlexGap
                >
                    <Button
                        data-category=""
                        data-testid="send-category-option"
                        onClick={() => onPick(null)}
                        variant="control"
                    >
                        No category
                    </Button>
                    {categories.map((category) => (
                        <Button
                            data-category={category}
                            data-testid="send-category-option"
                            key={category}
                            onClick={() => onPick(category)}
                            variant="control"
                        >
                            {category}
                        </Button>
                    ))}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
}
