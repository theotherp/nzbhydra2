import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";

import {reviewChangeTestId, type ReviewChange} from "./reviewChangesDiff";

const REVIEW_TITLE_ID = "config-review-changes-title";

/**
 * ADR-0029: below `sm` the four columns do not fit at 390px and the new value —
 * the one thing the panel exists to show — ends up off-canvas. The origin
 * column and the separate "previously" column are therefore dropped there and
 * the value pair reads as one cell. This is a CSS decision inside the one table
 * the panel has always rendered: no second component, no `useMediaQuery`
 * branch, so there is a single rendering path to test.
 */
const WIDE_ONLY = {display: {xs: "none", sm: "table-cell"}} as const;
const WIDE_ONLY_INLINE = {display: {xs: "none", sm: "inline"}} as const;
const NARROW_ONLY = {display: {xs: "inline", sm: "none"}} as const;

/**
 * `F-CONFIG-SHELL`'s review-before-save panel: what the sticky bar's summary
 * counts, spelled out, with the same Save the form itself runs.
 *
 * It exists because a save is not incremental — `ConfigWeb.setConfig` rewrites
 * the whole configuration file and may ask for a restart — so the cost of an
 * edit made by accident (a switch flipped while scrolling, a tab left dirty an
 * hour ago) is paid on every setting at once. The panel is deliberately
 * read-only apart from Save and Close: reverting one row would be a second,
 * partial discard next to the bar's existing one.
 *
 * Presentational by construction. It is handed rows that were already computed
 * from the form's dirty tree (`reviewChangesDiff.ts`) and never reads or writes
 * the form itself, which is what makes "opening the panel changes nothing"
 * testable rather than hopeful.
 */
export function ReviewChangesPanel({
    changes,
    onClose,
    onSave,
    open,
    saving,
}: {
    changes: readonly ReviewChange[];
    onClose: () => void;
    onSave: () => void;
    open: boolean;
    /** The shell's save is in flight; the panel's Save is the same action. */
    saving: boolean;
}) {
    return (
        <Dialog
            aria-labelledby={REVIEW_TITLE_ID}
            data-testid="config-review-changes"
            fullWidth
            maxWidth="md"
            onClose={onClose}
            open={open}
        >
            <DialogTitle id={REVIEW_TITLE_ID}>Review changes</DialogTitle>
            <DialogContent dividers>
                {changes.length === 0 ? (
                    <Typography data-testid="config-review-empty">
                        No changed settings to review.
                    </Typography>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Setting</TableCell>
                                    <TableCell sx={WIDE_ONLY}>
                                        Section
                                    </TableCell>
                                    <TableCell sx={WIDE_ONLY}>
                                        Previously
                                    </TableCell>
                                    <TableCell>
                                        <Box
                                            component="span"
                                            sx={WIDE_ONLY_INLINE}
                                        >
                                            Now
                                        </Box>
                                        <Box component="span" sx={NARROW_ONLY}>
                                            Change
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {changes.map((change) => (
                                    <TableRow
                                        data-testid={reviewChangeTestId(change)}
                                        key={change.id}
                                    >
                                        <TableCell>{change.label}</TableCell>
                                        <TableCell sx={WIDE_ONLY}>
                                            {change.origin}
                                        </TableCell>
                                        {change.oldText === null ||
                                        change.newText === null ? (
                                            // A list entry has no two values to
                                            // put side by side -- it was added,
                                            // removed, or edited somewhere
                                            // inside -- so the status spans the
                                            // pair of value columns.
                                            <TableCell colSpan={2}>
                                                {change.status}
                                            </TableCell>
                                        ) : (
                                            <>
                                                <TableCell sx={WIDE_ONLY}>
                                                    {change.oldText}
                                                </TableCell>
                                                <TableCell>
                                                    {/* Below `sm` the pair of
                                                    value columns is one cell
                                                    (ADR-0029): the previous
                                                    value moves in front of the
                                                    new one instead of sitting
                                                    in a column that would push
                                                    the new value off-canvas. A
                                                    secret reads "(hidden)" on
                                                    both sides, so merging it
                                                    leaves "(hidden) —
                                                    changed", never a value and
                                                    never "(hidden) →
                                                    (hidden)". */}
                                                    {change.oldText ===
                                                    change.newText ? null : (
                                                        <Box
                                                            component="span"
                                                            sx={NARROW_ONLY}
                                                        >
                                                            {`${change.oldText} → `}
                                                        </Box>
                                                    )}
                                                    {change.newText}
                                                    {/* A secret reads the
                                                    same on both sides, so the
                                                    row needs a word saying it
                                                    did change. */}
                                                    {change.status === null
                                                        ? null
                                                        : ` — ${change.status}`}
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button
                    data-testid="config-review-close"
                    onClick={onClose}
                    type="button"
                    variant="control"
                >
                    Close
                </Button>
                <Button
                    data-testid="config-review-save"
                    disabled={saving}
                    // Not `type="submit"`: the dialog renders in a portal
                    // outside the shell's `form` element, so submitting it is
                    // an explicit call to the same handler the bar's Save runs.
                    onClick={onSave}
                    type="button"
                    variant="contained"
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
