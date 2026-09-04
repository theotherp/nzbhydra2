import EditIcon from "@mui/icons-material/Edit";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import {
    Box,
    Button,
    Chip,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import {useEffect, useRef, useState} from "react";
import {useFormContext, useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {useDialogs} from "../../../components/dialogs/dialogs";
import {TableScrollAffordance} from "../../../components/table/TableScrollAffordance";
import {settingTestId, type ConfigFieldPath} from "../components";
import {CategoryDialog} from "./CategoryDialog";
import {
    categoryEntryLegend,
    categorySearchTypeLabel,
    categorySizeSummary,
    defaultCategoryEntry,
    newznabCategoryValidator,
    type CategoryValues,
} from "./categoriesSettings";

const CATEGORIES_PATH = "categoriesConfig.categories" as ConfigFieldPath;

/**
 * The container's test id is the one `RepeatSection` emitted for this list
 * before FM-107 (`config-repeat-categoriesConfig-categories`), kept unchanged
 * because `settingsIndex.ts` derives this section's search anchor from the
 * config path through its own `repeatAnchor` helper -- a file this packet may
 * not touch. Losing it would break FM-099's settings search and FM-102's "on
 * this page" list without breaking a single test, so `CategoriesTable.test.tsx`
 * asserts it against the index entry rather than against a literal.
 */
const CATEGORIES_ANCHOR_TEST_ID = `config-repeat-${settingTestId(CATEGORIES_PATH)}`;

const ADD_LABEL = "Add new category";

function categoriesOf(value: unknown): CategoryValues[] {
    return Array.isArray(value) ? (value as CategoryValues[]) : [];
}

type Editing = {
    index: number;
    /**
     * Whether this transaction was opened by Add rather than Edit. Drives the
     * dialog's title and whether it offers Delete, and -- unlike the
     * `DownloaderDialog`/`UserDialog` precedent, where a new entry has no
     * array slot until Submit -- also drives what Cancel does: see `add` and
     * `cancelTransaction`.
     */
    isNew: boolean;
    /**
     * The transaction's identity, compared against `transactionRef` before a
     * commit is applied. See `openTransaction`.
     */
    token: number;
    value: CategoryValues;
};

/**
 * `F-CONFIG-CATEGORIES`'s catalog (FM-119, following FM-107): legacy's stack
 * of per-category fieldsets (`config-fields-service.js:1604-1836`) as one
 * table whose rows are edited through `CategoryDialog`'s modal transaction --
 * the same shape `F-CONFIG-AUTH`'s `AuthUsersSection`/`UserDialog` and
 * `F-CONFIG-DOWNLOADING`'s `DownloaderTable`/`DownloaderDialog` already use
 * (ADR-0034).
 *
 * **Why a table at all.** A category is edited rarely and audited often: the
 * question an admin actually arrives with is "which category claims newznab
 * 5030" or "which ones have a size preset", and answering it meant scrolling
 * fourteen stacked fieldsets per category. The summary columns answer it
 * without opening anything; the full field set is one Edit away, in a dialog,
 * and is the same `CategoryEntryFields` as before.
 *
 * **Why this replaced the always-mounted accordion (FM-107).** `name` is
 * `required`, so before this change a collapsed row's fields stayed mounted --
 * `Collapse` without `unmountOnExit` -- purely so a blank name still blocked
 * the save with an error rendered somewhere in the DOM. That mounted all 16
 * base categories' 13 controllers each -- 208 registered inputs, 48
 * `Autocomplete`s and 64 `Select`s -- whether or not any row was open
 * (ADR-0034's evidence, and the owner's "categories subsection is slow"
 * report). `CategoryDialog` replaces the guarantee rather than dropping it:
 * its own `trigger()` refuses to commit a blank name, so the invalid state
 * cannot be created in the first place, and only one entry's fields are ever
 * registered at a time.
 *
 * **Why no reordering.** `CategoriesConfig.setCategories` re-sorts by name on
 * every deserialization (`CategoriesConfig.java:38-39`), so any order arranged
 * here is discarded on write-back. An affordance for it would be a lie.
 */
export function CategoriesTable() {
    const {getValues, setValue} = useFormContext<ConfigValues>();
    const dialogs = useDialogs();
    const entries = categoriesOf(
        useWatch<ConfigValues>({name: CATEGORIES_PATH}),
    );
    // Gated live rather than at mount: the switch sits above this table on the
    // same tab, so turning it on has to add the column without a reload.
    const showSizes =
        useWatch<ConfigValues>({
            name: "categoriesConfig.enableCategorySizes",
        }) === true;
    const [editing, setEditing] = useState<Editing | null>(null);
    /**
     * The identity of the transaction that is currently allowed to commit.
     * Every open and every close bumps it, so a commit from a dialog that was
     * already cancelled, deleted, or replaced is dropped instead of applied.
     * `CategoryDialog` has no asynchronous step of its own, but `onSubmit` is
     * still a closure captured by a render a later one may have replaced.
     */
    const transactionRef = useRef(0);
    const tableRef = useRef<HTMLTableElement | null>(null);
    /**
     * Bumped to ask for focus on the table. Adding, editing, and removing all
     * destroy the control that was focused (the dialog's Submit or Delete),
     * so without this a keyboard user is dropped on `document.body` and
     * restarts at the top of the page.
     */
    const [focusRequest, setFocusRequest] = useState(0);

    useEffect(() => {
        if (focusRequest === 0) {
            return undefined;
        }
        // Deferred by one macrotask for the same reason `AuthUsersSection`
        // does it: MUI's focus trap in the ancestor `DialogProvider` restores
        // focus to whatever opened the confirm/edit dialog in its own effect
        // cleanup, which runs after this effect, and the node it restores to
        // has just been unmounted. Zero delay -- this only has to fall behind
        // the same commit's remaining work.
        const handle = setTimeout(() => tableRef.current?.focus(), 0);
        return () => clearTimeout(handle);
    }, [focusRequest]);

    /** The array as the form holds it *now*, never one a render captured. */
    const currentEntries = () => categoriesOf(getValues(CATEGORIES_PATH));

    const write = (next: CategoryValues[]) =>
        setValue(CATEGORIES_PATH, next as never, {shouldDirty: true});

    const closeTransaction = () => {
        transactionRef.current += 1;
        setEditing(null);
    };

    /**
     * Unmount cleanup for an `add` transaction that is still open when the
     * component itself unmounts -- ordinary tab navigation, since
     * `ConfigShell.tsx` mounts only one tab body at a time while the shared
     * form above `<Outlet />` persists. Cancel, Escape, and the backdrop all
     * already undo `add`'s placeholder through `cancelTransaction`, and each
     * of those bumps `transactionRef` before this effect's cleanup can run,
     * so this is a no-op for all three -- and for a successful Submit, whose
     * `commit` also bumps `transactionRef` before writing the final entry.
     * Only a transaction still holding the live token when the component
     * unmounts is rolled back here, so a committed entry can never be
     * mistaken for an abandoned one.
     */
    useEffect(() => {
        if (editing === null || !editing.isNew) {
            return undefined;
        }
        const token = editing.token;
        const index = editing.index;
        return () => {
            if (transactionRef.current !== token) {
                return;
            }
            write(
                categoriesOf(getValues(CATEGORIES_PATH)).filter(
                    (_entry, entryIndex) => entryIndex !== index,
                ),
            );
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing]);

    /**
     * Pushes a default entry and opens its dialog immediately, in the same
     * spirit as the accordion's old expand-on-add (`CategoriesTable.tsx`'s
     * former `:155-162`) -- and, independently, so `C-CONFIG-REVIEW`'s
     * change summary has an entry to report the moment Add is clicked, not
     * only once a dialog is confirmed. Unlike the `DownloaderDialog`/
     * `UserDialog` precedent -- where a brand new entry has no array slot
     * until Submit -- the placeholder pushed here is undone by
     * `cancelTransaction` if the admin backs out without ever passing the
     * dialog's own name guard, so a blank category can never survive past
     * this transaction closing.
     */
    const add = () => {
        const index = currentEntries().length;
        write([...currentEntries(), defaultCategoryEntry()]);
        transactionRef.current += 1;
        setEditing({
            index,
            isNew: true,
            token: transactionRef.current,
            value: defaultCategoryEntry(),
        });
    };

    const edit = (index: number) => {
        transactionRef.current += 1;
        setEditing({
            index,
            isNew: false,
            token: transactionRef.current,
            value: structuredClone(currentEntries()[index]),
        });
    };

    /**
     * Cancel (including Escape and a backdrop click, both routed through
     * `CategoryDialog`'s `onClose`). For an edit of an existing entry this is
     * a pure discard -- the dialog never touched the shared form. For a
     * transaction `add` opened, the placeholder it pushed is removed here:
     * that is what keeps a category the admin never finished naming from
     * surviving to a save with no mounted field left anywhere to explain why
     * it was refused (`CategoryDialog`'s module doc).
     */
    const cancelTransaction = () => {
        if (editing !== null && editing.isNew) {
            const index = editing.index;
            write(
                currentEntries().filter(
                    (_entry, entryIndex) => entryIndex !== index,
                ),
            );
        }
        closeTransaction();
    };

    /**
     * Synchronous, and deliberately so: `CategoriesConfig.setCategories`
     * re-sorts the catalog by name on every save, so a config index is never
     * stable across an async gap. There is none here to be stable across --
     * `CategoryDialog` has no connection check or other await between its
     * `trigger()` and `onSubmit` -- but the token guard below still protects
     * against a stale closure if a later render replaced this transaction.
     */
    const commit = (token: number, index: number, entry: CategoryValues) => {
        if (token !== transactionRef.current) {
            return;
        }
        const current = currentEntries();
        if (index >= current.length) {
            // The row this transaction was opened over is gone (deleted from
            // elsewhere while the dialog was open). Committing would either
            // overwrite whoever shifted into its index or silently drop the
            // edit; both are worse than discarding it.
            closeTransaction();
            return;
        }
        write(
            current.map((existing, entryIndex) =>
                // Spread over the stored entry rather than replacing it
                // outright: `ConfigWeb.setConfig` writes the whole file back,
                // so a key this dialog has no control for must survive an
                // edit (ADR-0003).
                entryIndex === index ? {...existing, ...entry} : existing,
            ),
        );
        closeTransaction();
        setFocusRequest((request) => request + 1);
    };

    const remove = async (index: number) => {
        const entry = currentEntries()[index];
        if (entry === undefined) {
            return;
        }
        const legend = categoryEntryLegend(entry);
        const answer = await dialogs.confirm({
            title: "Delete category",
            message: `Delete the category "${legend}"?`,
            confirmLabel: "Delete",
            testId: "config-category-delete-confirm",
        });
        if (answer !== "confirmed") {
            return;
        }
        // A removal shifts every following index, so no transaction opened
        // before it may still commit by the index it captured.
        transactionRef.current += 1;
        write(
            currentEntries().filter(
                (_entry, entryIndex) => entryIndex !== index,
            ),
        );
        setEditing(null);
        setFocusRequest((request) => request + 1);
    };

    // Category, Search type, Newznab categories, and the size column only
    // while the catalog-wide switch is on.
    const columnCount = showSizes ? 4 : 3;

    return (
        <Box data-testid={CATEGORIES_ANCHOR_TEST_ID}>
            {/* Columns of an admin's own free text do not fit 390px, so
                whatever cannot fit scrolls here rather than pushing the page
                sideways (ADR-0029), and ADR-0038's affordance marks the edge
                it is clipping. The row's only control -- its Edit button --
                sits in the first cell, so nothing scrolled out of view is
                operable; what goes off the right edge is summary text the
                dialog repeats as real fields. */}
            <TableScrollAffordance scrollerTestId="config-categories-scroller">
                <Table
                    aria-label="Configured categories"
                    data-testid="config-categories-table"
                    ref={tableRef}
                    size="small"
                    // ADR-0038's width floor. Without one the table was
                    // squeezed *below* its own content: measured at 390x844 it
                    // rendered 350px wide where laying it out so no cell has to
                    // break a word needs 438px (Category 96, Search type 107,
                    // Newznab categories 163, Size 72), so category names and
                    // newznab token lists broke mid-word. 440 keeps every
                    // column at that intrinsic width, and with the size column
                    // switched off the three remaining ones simply share the
                    // floor.
                    sx={{minWidth: 440}}
                    // Focusable only programmatically: it is where focus is put
                    // after an add, edit, or delete, and it is not in the tab
                    // order.
                    tabIndex={-1}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell>Category</TableCell>
                            <TableCell>Search type</TableCell>
                            <TableCell>Newznab categories</TableCell>
                            {showSizes ? <TableCell>Size</TableCell> : null}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {entries.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columnCount}
                                    data-testid="config-categories-empty"
                                >
                                    <Typography variant="body2">
                                        No categories configured yet.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : null}
                        {entries.map((entry, index) => (
                            <CategoryTableRow
                                entry={entry}
                                // The index is the key on purpose, as it was in
                                // `RepeatSection`: a name is editable and row N
                                // always shows whatever is at index N.
                                key={index}
                                index={index}
                                onEdit={() => edit(index)}
                                showSizes={showSizes}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableScrollAffordance>
            <Button
                data-testid="config-categories-add"
                onClick={add}
                sx={{mt: 2}}
                type="button"
                variant="outlined"
            >
                {ADD_LABEL}
            </Button>
            {editing === null ? null : (
                <CategoryDialog
                    initialValue={editing.value}
                    isNew={editing.isNew}
                    onCancel={cancelTransaction}
                    onDelete={
                        editing.isNew
                            ? undefined
                            : () => void remove(editing.index)
                    }
                    onSubmit={(entry) =>
                        commit(editing.token, editing.index, entry)
                    }
                />
            )}
        </Box>
    );
}

/** One category's summary row. `CategoryDialog` renders and edits its fields. */
function CategoryTableRow({
    entry,
    index,
    onEdit,
    showSizes,
}: {
    entry: CategoryValues;
    index: number;
    onEdit: () => void;
    showSizes: boolean;
}) {
    const legend = categoryEntryLegend(entry);
    const sizeSummary = categorySizeSummary(entry);
    const newznabCategories = Array.isArray(entry.newznabCategories)
        ? entry.newznabCategories
        : [];

    return (
        <TableRow data-testid={`config-category-entry-${index}`}>
            <TableCell>
                <Stack
                    spacing={0.5}
                    sx={{
                        alignItems: "flex-start",
                    }}
                >
                    <Typography
                        data-testid={`config-category-name-${index}`}
                        // A category name is free text and can be long, so it
                        // still wraps inside the cell. `break-word` rather
                        // than `anywhere` (FM-126/ADR-0038): the two wrap the
                        // same way, but only `anywhere` also *shrinks* the
                        // column's intrinsic minimum to a single character, so
                        // the column reserved no room for the name at all --
                        // measured at 390x844, "Audiobook" needed 68px in a
                        // 65px cell and broke as "Audiobo / ok", at every
                        // table width from 440 to 560, because the column
                        // stayed ~98px however wide the table got. With
                        // `break-word` the column reserves its longest word
                        // and a genuinely long name still wraps rather than
                        // overflowing.
                        sx={{overflowWrap: "break-word"}}
                        variant="body2"
                    >
                        {legend}
                    </Typography>
                    {/*
                     * The button keeps a visible word and names the category
                     * only in its accessible name: "Edit some-long-name" on
                     * every row would set this column's width from the
                     * longest name twice over, and the name is directly
                     * above it anyway. The visible text is the first word of
                     * the accessible name, so the two agree (WCAG 2.5.3).
                     */}
                    <Button
                        aria-label={`Edit ${legend}`}
                        data-testid={`config-category-edit-${index}`}
                        onClick={onEdit}
                        size="small"
                        startIcon={<EditIcon />}
                        type="button"
                    >
                        Edit
                    </Button>
                </Stack>
            </TableCell>
            <TableCell data-testid={`config-category-searchType-${index}`}>
                {categorySearchTypeLabel(entry)}
            </TableCell>
            <TableCell
                data-testid={`config-category-newznabCategories-${index}`}
            >
                {newznabCategories.length === 0 ? (
                    <Typography variant="body2">None</Typography>
                ) : (
                    <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{flexWrap: "wrap"}}
                        useFlexGap
                    >
                        {newznabCategories.map((category) => {
                            const verdict = newznabCategoryValidator(category);
                            return (
                                <Chip
                                    // Flagged here too, not only inside the
                                    // dialog: a stored token the UI would
                                    // refuse today is exactly what an admin
                                    // scanning the catalog needs to find, and
                                    // it would otherwise be visible only after
                                    // opening the entry it sits in. Icon plus
                                    // accessible name, never the colour alone
                                    // (ADR-0029).
                                    aria-label={
                                        verdict === true
                                            ? undefined
                                            : `${category} — ${verdict}`
                                    }
                                    color={
                                        verdict === true ? "default" : "error"
                                    }
                                    icon={
                                        verdict === true ? undefined : (
                                            <ErrorOutlineOutlinedIcon />
                                        )
                                    }
                                    key={category}
                                    label={category}
                                    size="small"
                                    title={
                                        verdict === true ? undefined : verdict
                                    }
                                    variant="outlined"
                                />
                            );
                        })}
                    </Stack>
                )}
            </TableCell>
            {showSizes ? (
                <TableCell data-testid={`config-category-size-${index}`}>
                    {sizeSummary ?? "None"}
                </TableCell>
            ) : null}
        </TableRow>
    );
}
