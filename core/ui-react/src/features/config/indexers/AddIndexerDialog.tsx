import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import {useState} from "react";

import type {IndexerImportSource} from "../../../api/config/indexers";
import {INDEXER_IMPORT_ORDER, INDEXER_IMPORT_SOURCES} from "./indexerImport";
import {
    CUSTOM_NEWZNAB_PRESET,
    CUSTOM_TORZNAB_PRESET,
    NEWZNAB_PRESETS,
    SPECIAL_PRESETS,
    TORZNAB_PRESETS,
    type IndexerPreset,
} from "./indexerPresets";

const ADD_INDEXER_DIALOG_TEST_ID = "config-indexer-add-dialog";

/**
 * One of the three preset groups the gallery renders, in the arrays' order.
 * `customPreset`, where present, is prepended ahead of the array — it is the
 * blank-entry choice for that backend, not one of the parity presets.
 */
type PresetGroup = {
    customPreset?: IndexerPreset;
    /** Also the `data-testid` group segment, `config-indexer-preset-<key>-*`. */
    key: "newznab" | "special" | "torznab";
    heading: string;
    presets: readonly IndexerPreset[];
};

const PRESET_GROUPS: readonly PresetGroup[] = [
    {
        customPreset: CUSTOM_NEWZNAB_PRESET,
        heading: "Usenet",
        key: "newznab",
        presets: NEWZNAB_PRESETS,
    },
    {
        customPreset: CUSTOM_TORZNAB_PRESET,
        heading: "Torrents",
        key: "torznab",
        presets: TORZNAB_PRESETS,
    },
    {heading: "Special", key: "special", presets: SPECIAL_PRESETS},
];

function matches(label: string, normalizedQuery: string): boolean {
    return (
        normalizedQuery === "" || label.toLowerCase().includes(normalizedQuery)
    );
}

/**
 * `indexer-config-selection.html` / `IndexerConfigSelectionBoxInstanceController`:
 * the "Add indexer" chooser, as a searchable gallery (FM-104) rather than
 * legacy's two anchor menus — every preset is a directly clickable item, so
 * picking one is a single click instead of open-menu-then-click.
 *
 * Picking a preset here only *seeds* a new entry — the entry itself is composed
 * in `IndexerDialog` and does not exist until that dialog is submitted
 * (`addEntry` pushes into the model from the box's success callback, never
 * before).
 *
 * The two importers are the exception, and legacy files them here for the same
 * reason (`indexer-config-selection.html`'s "Read from ..." menu entries): they
 * are reached from the same add surface but they replace the whole list rather
 * than seeding one entry, which is why they are visibly separated from the
 * presets and open their own dialog. The gallery's filter still narrows them by
 * their own label — they are just never treated as members of a *preset*
 * group, so a group emptying out never hides them.
 */
export function AddIndexerDialog({
    onCancel,
    onImport,
    onSelect,
}: {
    onCancel: () => void;
    onImport: (source: IndexerImportSource) => void;
    onSelect: (preset: IndexerPreset) => void;
}) {
    const [query, setQuery] = useState("");
    const normalizedQuery = query.trim().toLowerCase();

    const groups = PRESET_GROUPS.map((group) => {
        const items = group.customPreset
            ? [group.customPreset, ...group.presets]
            : group.presets;
        return {
            ...group,
            filtered: items.filter((preset) =>
                matches(preset.label, normalizedQuery),
            ),
        };
    });
    const totalMatches = groups.reduce(
        (sum, group) => sum + group.filtered.length,
        0,
    );
    const visibleImporters = INDEXER_IMPORT_ORDER.filter((source) =>
        matches(INDEXER_IMPORT_SOURCES[source].openLabel, normalizedQuery),
    );

    return (
        <Dialog
            data-testid={ADD_INDEXER_DIALOG_TEST_ID}
            fullWidth
            maxWidth="md"
            onClose={onCancel}
            open
        >
            <DialogTitle>Add indexer</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    <TextField
                        autoFocus
                        label="Filter presets"
                        onChange={(event) => setQuery(event.target.value)}
                        slotProps={{
                            htmlInput: {
                                "data-testid": "config-indexer-preset-filter",
                            },
                        }}
                        type="search"
                        value={query}
                    />
                    {groups.map((group) =>
                        group.filtered.length === 0 ? null : (
                            <Stack key={group.key} spacing={1}>
                                <Typography component="h3" variant="subtitle1">
                                    {group.heading}
                                </Typography>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gap: 1,
                                        // Three widths are enough to notice
                                        // reflow with the panel's own widths
                                        // (390 / ~700 tablet / desktop `md`)
                                        // without needing an `auto-fill`
                                        // measurement.
                                        gridTemplateColumns: {
                                            md: "repeat(3, minmax(0, 1fr))",
                                            sm: "repeat(2, minmax(0, 1fr))",
                                            xs: "1fr",
                                        },
                                    }}
                                >
                                    {group.filtered.map((preset) => {
                                        const isCustom =
                                            group.customPreset !== undefined &&
                                            preset.slug ===
                                                group.customPreset.slug;
                                        return (
                                            <Button
                                                data-testid={`config-indexer-preset-${group.key}-${preset.slug}`}
                                                key={preset.slug}
                                                onClick={() => onSelect(preset)}
                                                startIcon={
                                                    isCustom ? (
                                                        <AddCircleOutlineOutlinedIcon fontSize="small" />
                                                    ) : undefined
                                                }
                                                sx={{
                                                    justifyContent:
                                                        "flex-start",
                                                    textAlign: "left",
                                                }}
                                                title={preset.label}
                                                type="button"
                                                variant="outlined"
                                            >
                                                <Typography
                                                    component="span"
                                                    noWrap
                                                    variant="body2"
                                                >
                                                    {isCustom ? (
                                                        <em>{preset.label}</em>
                                                    ) : (
                                                        preset.label
                                                    )}
                                                </Typography>
                                            </Button>
                                        );
                                    })}
                                </Box>
                            </Stack>
                        ),
                    )}
                    {totalMatches === 0 ? (
                        <Typography
                            data-testid="config-indexer-preset-no-matches"
                            variant="body2"
                        >
                            No presets match “{query}”.
                        </Typography>
                    ) : null}
                    <Stack spacing={1}>
                        <Typography component="h3" variant="subtitle1">
                            Import
                        </Typography>
                        <Stack
                            direction={{xs: "column", sm: "row"}}
                            spacing={1}
                        >
                            {visibleImporters.map((source) => (
                                <Button
                                    data-testid={`config-indexer-import-${source}`}
                                    key={source}
                                    onClick={() => onImport(source)}
                                    type="button"
                                    variant="outlined"
                                >
                                    {INDEXER_IMPORT_SOURCES[source].openLabel}
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
        </Dialog>
    );
}
