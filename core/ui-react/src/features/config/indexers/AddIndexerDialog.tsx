import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Menu,
    MenuItem,
    Stack,
    Typography,
} from "@mui/material";
import {useState} from "react";

import {
    CUSTOM_NEWZNAB_PRESET,
    CUSTOM_TORZNAB_PRESET,
    NEWZNAB_PRESETS,
    SPECIAL_PRESETS,
    TORZNAB_PRESETS,
    type IndexerPreset,
} from "./indexerPresets";

export const ADD_INDEXER_DIALOG_TEST_ID = "config-indexer-add-dialog";

/**
 * `indexer-config-selection.html` / `IndexerConfigSelectionBoxInstanceController`:
 * the "Add indexer" chooser, with legacy's three groups.
 *
 * Picking anything here only *seeds* a new entry — the entry itself is composed
 * in `IndexerDialog` and does not exist until that dialog is submitted
 * (`addEntry` pushes into the model from the box's success callback, never
 * before).
 *
 * Legacy's two "Read from Jackett/Prowlarr config" menu entries are deliberately
 * absent: those are configuration *imports*, not presets, and they are FM-067's.
 */
export function AddIndexerDialog({
    onCancel,
    onSelect,
}: {
    onCancel: () => void;
    onSelect: (preset: IndexerPreset) => void;
}) {
    const [newznabAnchor, setNewznabAnchor] = useState<HTMLElement | null>(
        null,
    );
    const [torznabAnchor, setTorznabAnchor] = useState<HTMLElement | null>(
        null,
    );

    const pick = (preset: IndexerPreset) => {
        setNewznabAnchor(null);
        setTorznabAnchor(null);
        onSelect(preset);
    };

    return (
        <Dialog
            data-testid={ADD_INDEXER_DIALOG_TEST_ID}
            fullWidth
            maxWidth="sm"
            onClose={onCancel}
            open
        >
            <DialogTitle>Add indexer</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    <Stack spacing={1}>
                        <Typography component="h3" variant="subtitle1">
                            Usenet
                        </Typography>
                        <Stack
                            direction={{xs: "column", sm: "row"}}
                            spacing={1}
                        >
                            <Button
                                aria-haspopup="menu"
                                data-testid="config-indexer-preset-menu-newznab"
                                onClick={(event) =>
                                    setNewznabAnchor(event.currentTarget)
                                }
                                type="button"
                                variant="outlined"
                            >
                                Choose from presets
                            </Button>
                            <Button
                                data-testid="config-indexer-preset-newznab-custom-newznab"
                                onClick={() => pick(CUSTOM_NEWZNAB_PRESET)}
                                type="button"
                                variant="outlined"
                            >
                                {CUSTOM_NEWZNAB_PRESET.label}
                            </Button>
                        </Stack>
                    </Stack>
                    <Stack spacing={1}>
                        <Typography component="h3" variant="subtitle1">
                            Torrents
                        </Typography>
                        <Stack
                            direction={{xs: "column", sm: "row"}}
                            spacing={1}
                        >
                            <Button
                                aria-haspopup="menu"
                                data-testid="config-indexer-preset-menu-torznab"
                                onClick={(event) =>
                                    setTorznabAnchor(event.currentTarget)
                                }
                                type="button"
                                variant="outlined"
                            >
                                Choose from presets
                            </Button>
                            <Button
                                data-testid="config-indexer-preset-torznab-custom-torznab"
                                onClick={() => pick(CUSTOM_TORZNAB_PRESET)}
                                type="button"
                                variant="outlined"
                            >
                                {CUSTOM_TORZNAB_PRESET.label}
                            </Button>
                        </Stack>
                    </Stack>
                    <Stack spacing={1}>
                        <Typography component="h3" variant="subtitle1">
                            Special
                        </Typography>
                        <Stack
                            direction={{xs: "column", sm: "row"}}
                            spacing={1}
                        >
                            {SPECIAL_PRESETS.map((preset) => (
                                <Button
                                    data-testid={`config-indexer-preset-special-${preset.slug}`}
                                    key={preset.slug}
                                    onClick={() => pick(preset)}
                                    type="button"
                                    variant="outlined"
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </Stack>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    data-testid="config-indexer-add-dialog-cancel"
                    onClick={onCancel}
                    type="button"
                >
                    Cancel
                </Button>
            </DialogActions>
            <Menu
                anchorEl={newznabAnchor}
                onClose={() => setNewznabAnchor(null)}
                open={newznabAnchor !== null}
            >
                {NEWZNAB_PRESETS.map((preset) => (
                    <MenuItem
                        data-testid={`config-indexer-preset-newznab-${preset.slug}`}
                        key={preset.slug}
                        onClick={() => pick(preset)}
                    >
                        {preset.label}
                    </MenuItem>
                ))}
            </Menu>
            <Menu
                anchorEl={torznabAnchor}
                onClose={() => setTorznabAnchor(null)}
                open={torznabAnchor !== null}
            >
                {TORZNAB_PRESETS.map((preset) => (
                    <MenuItem
                        data-testid={`config-indexer-preset-torznab-${preset.slug}`}
                        key={preset.slug}
                        onClick={() => pick(preset)}
                    >
                        {preset.label}
                    </MenuItem>
                ))}
            </Menu>
        </Dialog>
    );
}
