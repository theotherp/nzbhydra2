import {Box, Button, Paper, Stack} from "@mui/material";

/**
 * `F-CONFIG-SHELL`'s sticky action bar. It holds Save at every scroll position
 * — the configuration tabs are long enough that legacy's header-row Save
 * scrolled out of reach — and, while the form is dirty, summarizes how much is
 * unsaved and offers the same discard the unsaved-changes guard offers.
 *
 * FM-097 deliberately dropped legacy's dirty-state colour switch on Save
 * itself (success while pristine, primary while unsaved). The summary and
 * Discard now carry that signal in words rather than in a hue, so keeping the
 * switch would have been a second, weaker copy of it.
 */
export function ConfigSaveBar({
    dirty,
    dirtyCount,
    onDiscard,
    onReviewChanges,
    saving,
    search,
}: {
    dirty: boolean;
    dirtyCount: number;
    onDiscard: () => void;
    /**
     * FM-100: the summary is the way into the review-changes panel, so the
     * count that says *how much* is unsaved is also what shows *what* is. The
     * bar owns neither the panel nor the diff behind it — it reports a click
     * and nothing else.
     */
    onReviewChanges: () => void;
    saving: boolean;
    /**
     * FM-099's settings search, as a slot. The bar holds no search state and
     * knows nothing about what is put here: it is the only place a control can
     * be mounted that stays reachable at every scroll position, which is the
     * whole reason this component exists, so it offers the position and the
     * shell decides what fills it. Absent, the bar renders exactly as FM-097
     * left it.
     */
    search?: React.ReactNode;
}) {
    return (
        <Paper
            data-testid="config-save-bar"
            elevation={0}
            sx={{
                backgroundColor: "surfaces.bar",
                borderBottom: "1px solid",
                borderBottomColor: "surfaces.hairlineFaint",
                borderRadius: 0,
                position: "sticky",
                px: 2,
                py: 1.5,
                top: 0,
                // Above the tab bodies it pins over, below the application's
                // own overlays; `AppShell`'s header is `position="static"` and
                // scrolls away, so the bar owns the top of the viewport.
                zIndex: (theme) => theme.zIndex.appBar,
            }}
        >
            <Stack
                alignItems="center"
                direction="row"
                spacing={2}
                sx={{flexWrap: "wrap"}}
            >
                {search}
                <Box sx={{flexGrow: 1, minWidth: 0}}>
                    {dirty && (
                        <Button
                            aria-haspopup="dialog"
                            data-testid="config-dirty-summary"
                            onClick={onReviewChanges}
                            sx={{color: "text.secondary"}}
                            type="button"
                            variant="text"
                        >
                            {dirtyCount === 1
                                ? "1 setting changed"
                                : `${dirtyCount} settings changed`}
                        </Button>
                    )}
                </Box>
                {dirty && (
                    <Button
                        data-testid="config-discard"
                        onClick={onDiscard}
                        type="button"
                        variant="control"
                    >
                        Discard
                    </Button>
                )}
                <Button
                    data-testid="config-save"
                    disabled={saving}
                    type="submit"
                    variant="contained"
                >
                    Save
                </Button>
            </Stack>
        </Paper>
    );
}
