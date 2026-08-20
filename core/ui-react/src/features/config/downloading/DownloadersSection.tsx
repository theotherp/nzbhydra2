import EditIcon from "@mui/icons-material/Edit";
import {
    Box,
    Button,
    Divider,
    Menu,
    MenuItem,
    Stack,
    Typography,
} from "@mui/material";
import {useRef, useState} from "react";
import {useFormContext, useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {SwitchSetting} from "../components";
import {DownloaderDialog} from "./DownloaderDialog";
import {
    asDownloader,
    downloaderFieldPath,
    downloaderLegend,
    downloaderText,
    downloadersOf,
    DOWNLOADERS_PATH,
    DOWNLOADERS_TEST_ID,
    DOWNLOADER_PRESETS,
    newDownloaderDraft,
    type DownloaderValues,
} from "./downloadingSettings";

type Editing = {
    /** `null` while a *new* downloader is being composed. */
    index: number | null;
    /**
     * The transaction's identity, compared against `transactionRef` before a
     * commit is applied. See `openTransaction`.
     */
    token: number;
    value: DownloaderValues;
};

/**
 * `F-CONFIG-DOWNLOADING`'s downloader list — legacy's `downloader-config.html`
 * and the `downloaderConfig` field type it belongs to.
 *
 * Only this component talks to `C-CONFIG-FORM`: adding, replacing, and
 * removing an entry go through the shared form's `setValue` with
 * `shouldDirty`, so the array lives in the form (not in component state) and
 * survives switching config tabs. Nothing is persisted until the configuration
 * itself is saved.
 *
 * It is not `C-CONFIG-FIELDS`' `RepeatSection`, whose registry entry describes
 * a list edited *in place*: a downloader is edited through
 * `DownloaderDialog`'s transaction, and a new one only exists once that
 * transaction is submitted (`formly-downloaders.js:91-107` pushes the entry in
 * the modal's success callback, never before).
 *
 * The rows are shown in the configured order. Legacy sorted the display by
 * name (`orderBy: ['name'] track by entry.name`), which pairs a display order
 * with the array indices it edits and breaks outright on two downloaders with
 * the same name; the order the config holds is the honest one to show.
 */
export function DownloadersSection({transport}: {transport: ApiTransport}) {
    const {getValues, setValue} = useFormContext<ConfigValues>();
    const entries = downloadersOf(
        useWatch<ConfigValues>({name: DOWNLOADERS_PATH}),
    );
    const [editing, setEditing] = useState<Editing | null>(null);
    const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(
        null,
    );
    /**
     * The identity of the transaction that is currently allowed to commit.
     * Every open and every close bumps it, so a connection check that only
     * resolves after its dialog was cancelled, deleted, or replaced carries a
     * stale token and its commit is dropped instead of applied. The dialog
     * itself is blocked while a check runs, which is legacy's `blockUI`; this
     * is the second line of defence, because `onSubmit` is captured by an
     * async closure that outlives the render — and the state it closes over —
     * that started the check.
     */
    const transactionRef = useRef(0);

    const openTransaction = (index: number | null, value: DownloaderValues) => {
        transactionRef.current += 1;
        setEditing({index, token: transactionRef.current, value});
    };

    const closeTransaction = () => {
        transactionRef.current += 1;
        setEditing(null);
    };

    const write = (next: DownloaderValues[]) =>
        setValue(DOWNLOADERS_PATH, next as never, {shouldDirty: true});

    /** The array as the form holds it *now*, never a value a render captured. */
    const currentEntries = () => downloadersOf(getValues(DOWNLOADERS_PATH));

    const commit = (
        token: number,
        index: number | null,
        entry: DownloaderValues,
    ) => {
        if (token !== transactionRef.current) {
            return;
        }
        const current = currentEntries();
        write(
            index === null
                ? [...current, entry]
                : current.map((existing, entryIndex) =>
                      entryIndex === index ? {...existing, ...entry} : existing,
                  ),
        );
        closeTransaction();
    };

    /**
     * `null` is the new entry legacy has nothing to delete yet (its
     * `ng-if="!isInitial"`), which is why the dialog is given no Delete at all
     * in that case.
     */
    const remove = (index: number | null) => {
        if (index === null) {
            return;
        }
        write(
            currentEntries().filter(
                (_entry, entryIndex) => entryIndex !== index,
            ),
        );
        closeTransaction();
    };

    return (
        <Box data-testid={`config-repeat-${DOWNLOADERS_TEST_ID}`}>
            <Stack divider={<Divider />} spacing={2} sx={{mb: 2}}>
                {entries.map((entry, index) => (
                    // The index is the key on purpose, as in `RepeatSection`:
                    // a downloader's name is editable and not guaranteed
                    // unique, and row N always shows and edits whatever is
                    // currently at index N.
                    <DownloaderEntryRow
                        entry={entry}
                        index={index}
                        key={index}
                        onEdit={() =>
                            openTransaction(index, asDownloader(entry))
                        }
                    />
                ))}
            </Stack>
            <Button
                aria-haspopup="menu"
                data-testid={`config-repeat-add-${DOWNLOADERS_TEST_ID}`}
                onClick={(event) => setAddMenuAnchor(event.currentTarget)}
                type="button"
                variant="outlined"
            >
                Add new downloader
            </Button>
            <Menu
                anchorEl={addMenuAnchor}
                onClose={() => setAddMenuAnchor(null)}
                open={addMenuAnchor !== null}
            >
                {DOWNLOADER_PRESETS.map((preset) => (
                    <MenuItem
                        data-testid={`config-repeat-add-option-${DOWNLOADERS_TEST_ID}-${preset.value}`}
                        key={preset.value}
                        onClick={() => {
                            setAddMenuAnchor(null);
                            openTransaction(
                                null,
                                newDownloaderDraft(preset.value),
                            );
                        }}
                    >
                        {preset.label}
                    </MenuItem>
                ))}
            </Menu>
            {editing === null ? null : (
                <DownloaderDialog
                    existingNames={otherNames(entries, editing.index)}
                    initialValue={editing.value}
                    isNew={editing.index === null}
                    onCancel={closeTransaction}
                    onDelete={
                        editing.index === null
                            ? undefined
                            : () => remove(editing.index)
                    }
                    onSubmit={(entry) =>
                        commit(editing.token, editing.index, entry)
                    }
                    transport={transport}
                />
            )}
        </Box>
    );
}

/** Legacy's uniqueness check ignores the entry being edited itself. */
function otherNames(
    entries: DownloaderValues[],
    index: number | null,
): string[] {
    return entries
        .map((entry, entryIndex) =>
            entryIndex === index ? "" : downloaderText(entry.name),
        )
        .filter((name) => name !== "");
}

function DownloaderEntryRow({
    entry,
    index,
    onEdit,
}: {
    entry: DownloaderValues;
    index: number;
    onEdit: () => void;
}) {
    const legend = downloaderLegend(entry);
    const rows: {field: string; label: string; value: string}[] = [
        {
            field: "downloaderType",
            label: "Type",
            value: downloaderText(entry.downloaderType),
        },
        {field: "url", label: "URL", value: downloaderText(entry.url)},
    ];

    return (
        <Box
            data-testid={`config-repeat-entry-${DOWNLOADERS_TEST_ID}-${index}`}
        >
            <Typography component="h3" sx={{mb: 1}} variant="subtitle1">
                {legend}
            </Typography>
            <Box component="dl" sx={{m: 0, mb: 1}}>
                {rows.map((row) => (
                    <Stack
                        direction={{xs: "column", sm: "row"}}
                        key={row.field}
                        spacing={{sm: 1}}
                    >
                        <Typography
                            component="dt"
                            sx={{minWidth: 180}}
                            variant="body2"
                        >
                            {row.label}
                        </Typography>
                        <Typography
                            component="dd"
                            data-testid={`config-downloader-value-${index}-${row.field}`}
                            sx={{m: 0}}
                            variant="body2"
                        >
                            {row.value}
                        </Typography>
                    </Stack>
                ))}
            </Box>
            {/*
             * Legacy puts an enable/disable switch next to every downloader in
             * the list, editing the configuration directly rather than through
             * the modal (`downloader-config.html:29`). It stays that way: it is
             * a one-click toggle, not an edit that needs verifying.
             */}
            <SwitchSetting
                label="Enabled"
                name={downloaderFieldPath(index, "enabled")}
            />
            <Button
                data-testid={`config-repeat-edit-${DOWNLOADERS_TEST_ID}-${index}`}
                onClick={onEdit}
                startIcon={<EditIcon />}
                type="button"
            >
                Edit {legend}
            </Button>
        </Box>
    );
}
