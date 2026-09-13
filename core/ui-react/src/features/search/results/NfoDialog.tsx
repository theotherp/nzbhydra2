import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from "@mui/material";

import {monoFontFamily} from "../../../app/theme";

/**
 * The NFO viewer behind every result row's NFO action (`API-SEARCH-NFO`).
 *
 * Legacy opened a modal whose whole body was
 * `<pre class="nfo"><span ng-bind-html="nfo"></span></pre>`
 * (`search-result.js:170-183`), so an indexer that returned markup — or a
 * script tag — had it interpreted by the browser. Here the NFO is passed to
 * React as children of a `<pre>`-style `Typography`, which produces a text
 * node: markup arrives as visible characters and nothing in this file (or
 * anywhere on this path) uses `dangerouslySetInnerHTML`. The rendering is
 * otherwise the same: preformatted, monospace, scrollable.
 *
 * A feature-owned MUI `Dialog` rather than `C-DIALOG-SERVICE.confirm`, which
 * models a message-and-details confirmation and cannot carry a preformatted
 * block — the same shape `system/logs/LogEntryDialog` uses.
 */
export function NfoDialog({
    content,
    onClose,
    title,
}: {
    /** `null` keeps the dialog closed; a string (including "") opens it. */
    content: string | null;
    onClose: () => void;
    /** The result's title, so an opened dialog says which NFO it shows. */
    title: string;
}) {
    return (
        <Dialog
            aria-labelledby="nfo-dialog-title"
            data-testid="nfo-dialog"
            fullWidth
            maxWidth="lg"
            onClose={onClose}
            open={content !== null}
        >
            <DialogTitle id="nfo-dialog-title">NFO: {title}</DialogTitle>
            <DialogContent dividers>
                <Typography
                    component="pre"
                    data-testid="nfo-dialog-content"
                    sx={{
                        fontFamily: monoFontFamily,
                        maxHeight: "60vh",
                        my: 0,
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                    }}
                    variant="body2"
                >
                    {content}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose} variant="contained">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
