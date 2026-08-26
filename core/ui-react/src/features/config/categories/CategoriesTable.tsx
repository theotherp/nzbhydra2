import DeleteIcon from "@mui/icons-material/Delete";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
    Box,
    Button,
    Chip,
    Collapse,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import {useEffect, useRef, useState} from "react";
import {useFormContext, useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {useDialogs} from "../../../components/dialogs/dialogs";
import {settingTestId, type ConfigFieldPath} from "../components";
import {CategoryEntryFields} from "./CategoryEntryFields";
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

/**
 * `F-CONFIG-CATEGORIES`'s catalog (FM-107): legacy's stack of per-category
 * fieldsets (`config-fields-service.js:1604-1836`, rendered through
 * `RepeatSection` until now) as one table whose rows expand in place.
 *
 * **Why a table at all.** A category is edited rarely and audited often: the
 * question an admin actually arrives with is "which category claims newznab
 * 5030" or "which ones have a size preset", and answering it meant scrolling
 * fourteen stacked fieldsets per category. The summary columns answer it
 * without opening anything; the full field set is one toggle away and is the
 * same `CategoryEntryFields` as before.
 *
 * **Why the fields stay mounted while a row is collapsed.** `name` is
 * `required`, so a blank one blocks the save. If collapsing unmounted the row's
 * controls, `C-CONFIG-FORM` would refuse to submit while the message explaining
 * why was in a part of the DOM that does not exist -- the admin would see a
 * blocked save and nothing else. `Collapse` without `unmountOnExit` hides the
 * fields without unmounting them, so the row's error renders inside a row the
 * admin can then open.
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
    const [expanded, setExpanded] = useState<readonly number[]>([]);
    const tableRef = useRef<HTMLTableElement | null>(null);
    /**
     * Bumped to ask for focus on the table. Adding and removing both destroy
     * the control that was focused (the add button keeps existing, but the
     * removed row's Delete does not), so without this a keyboard user is
     * dropped on `document.body` and restarts at the top of the page.
     */
    const [focusRequest, setFocusRequest] = useState(0);
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    /**
     * The width an expanded row's fields are given, in pixels, or `null` before
     * it has been measured.
     *
     * An expansion is a cell of this table, so it is as wide as the table --
     * and below about 600px the table is wider than its own scroll container.
     * Left alone, that puts the right edge of every text field the expansion
     * renders behind the container's horizontal scroll, which is the rendering
     * ADR-0029 refuses: summary text scrolled out of view is fine, an input is
     * not. Pinning the expansion to the container's *visible* width instead
     * (with `position: sticky` below, so it stays put while the summary columns
     * scroll under it) keeps every field wholly on screen at any viewport.
     *
     * Measured rather than assumed, because there is no fixed number to write
     * down: the container is as wide as the config shell leaves it, which
     * depends on the settings nav being a sidebar or a drawer.
     */
    const [fieldsWidth, setFieldsWidth] = useState<number | null>(null);

    useEffect(() => {
        const scroller = scrollerRef.current;
        if (scroller === null || typeof ResizeObserver === "undefined") {
            // No observer (jsdom): the expansion falls back to the cell's own
            // width, which is what it had before this measurement existed.
            return undefined;
        }
        const observer = new ResizeObserver(() =>
            setFieldsWidth(scroller.clientWidth),
        );
        observer.observe(scroller);
        setFieldsWidth(scroller.clientWidth);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (focusRequest === 0) {
            return undefined;
        }
        // Deferred by one macrotask for the same reason `AuthUsersSection` does
        // it: MUI's focus trap in the ancestor `DialogProvider` restores focus
        // to whatever opened the confirm dialog in its own effect cleanup,
        // which runs after this effect, and the node it restores to has just
        // been unmounted. Zero delay -- this only has to fall behind the same
        // commit's remaining work.
        const handle = setTimeout(() => tableRef.current?.focus(), 0);
        return () => clearTimeout(handle);
    }, [focusRequest]);

    /** The array as the form holds it *now*, never one a render captured. */
    const currentEntries = () => categoriesOf(getValues(CATEGORIES_PATH));

    const write = (next: CategoryValues[]) =>
        setValue(CATEGORIES_PATH, next as never, {shouldDirty: true});

    const add = () => {
        const next = currentEntries();
        write([...next, defaultCategoryEntry()]);
        // Opened straight away: a new category's `name` is blank and required,
        // so a collapsed new row would block the save behind a closed door.
        setExpanded((open) => [...open, next.length]);
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
        write(
            currentEntries().filter(
                (_entry, entryIndex) => entryIndex !== index,
            ),
        );
        // Expansion is keyed by configuration index, so a removal shifts it:
        // every row after the removed one moves down by one, and the removed
        // one's own state is dropped. Left alone, a different category would
        // silently appear expanded.
        setExpanded((open) =>
            open
                .filter((entryIndex) => entryIndex !== index)
                .map((entryIndex) =>
                    entryIndex > index ? entryIndex - 1 : entryIndex,
                ),
        );
        setFocusRequest((request) => request + 1);
    };

    const toggle = (index: number) =>
        setExpanded((open) =>
            open.includes(index)
                ? open.filter((entryIndex) => entryIndex !== index)
                : [...open, index],
        );

    // Expand toggle, Category, Search type, Newznab categories, and the size
    // column only while the catalog-wide switch is on.
    const columnCount = showSizes ? 5 : 4;

    return (
        <Box data-testid={CATEGORIES_ANCHOR_TEST_ID}>
            <TableContainer
                // Named so a test can address the element that actually
                // scrolls, rather than reaching for the table's parent.
                data-testid="config-categories-scroller"
                ref={scrollerRef}
                // Five columns of an admin's own free text do not fit 390px, so
                // whatever cannot fit scrolls here rather than pushing the page
                // sideways (ADR-0029). Both of a row's controls -- its expand
                // toggle and its Delete -- sit in the first two cells, so
                // nothing scrolled out of view is operable; what goes off the
                // right edge is summary text that the expanded row repeats as
                // real fields.
                sx={{overflowX: "auto"}}
            >
                <Table
                    aria-label="Configured categories"
                    data-testid="config-categories-table"
                    ref={tableRef}
                    size="small"
                    // Focusable only programmatically: it is where focus is put
                    // after an add or a delete, and it is not in the tab order.
                    tabIndex={-1}
                >
                    <TableHead>
                        <TableRow>
                            {/* The toggle column's header is empty by design; each
                                toggle carries its own accessible name. */}
                            <TableCell />
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
                                columnCount={columnCount}
                                entry={entry}
                                expanded={expanded.includes(index)}
                                fieldsWidth={fieldsWidth}
                                index={index}
                                // The index is the key on purpose, as it was in
                                // `RepeatSection`: a name is editable and row N
                                // always shows whatever is at index N.
                                key={index}
                                onRemove={() => void remove(index)}
                                onToggle={() => toggle(index)}
                                showSizes={showSizes}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Button
                data-testid="config-categories-add"
                onClick={add}
                sx={{mt: 2}}
                type="button"
                variant="outlined"
            >
                {ADD_LABEL}
            </Button>
        </Box>
    );
}

/**
 * One category: a summary row and the expansion row underneath it that holds
 * the entry's real fields. Two `TableRow`s rather than one, because a table
 * cell cannot contain another row and the expansion has to span the full width.
 */
function CategoryTableRow({
    columnCount,
    entry,
    expanded,
    fieldsWidth,
    index,
    onRemove,
    onToggle,
    showSizes,
}: {
    columnCount: number;
    entry: CategoryValues;
    expanded: boolean;
    /** See `fieldsWidth` in `CategoriesTable`; `null` until measured. */
    fieldsWidth: number | null;
    index: number;
    onRemove: () => void;
    onToggle: () => void;
    showSizes: boolean;
}) {
    const legend = categoryEntryLegend(entry);
    const sizeSummary = categorySizeSummary(entry);
    const newznabCategories = Array.isArray(entry.newznabCategories)
        ? entry.newznabCategories
        : [];

    return (
        <>
            <TableRow data-testid={`config-category-entry-${index}`}>
                <TableCell>
                    <IconButton
                        aria-controls={`config-category-fields-${index}`}
                        aria-expanded={expanded}
                        aria-label={
                            expanded ? `Collapse ${legend}` : `Expand ${legend}`
                        }
                        data-testid={`config-category-expand-${index}`}
                        onClick={onToggle}
                        size="small"
                    >
                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </TableCell>
                <TableCell>
                    <Stack alignItems="flex-start" spacing={0.5}>
                        <Typography
                            data-testid={`config-category-name-${index}`}
                            // A category name is free text and can be long; it
                            // wraps inside the cell rather than widening the
                            // column.
                            sx={{overflowWrap: "anywhere"}}
                            variant="body2"
                        >
                            {legend}
                        </Typography>
                        {/*
                         * The button keeps a visible word and names the category
                         * only in its accessible name: "Delete some-long-name"
                         * on every row would set this column's width from the
                         * longest name twice over, and the name is directly
                         * above it anyway. The visible text is the first word
                         * of the accessible name, so the two agree (WCAG 2.5.3).
                         */}
                        <Button
                            aria-label={`Delete ${legend}`}
                            color="error"
                            data-testid={`config-category-remove-${index}`}
                            onClick={onRemove}
                            size="small"
                            startIcon={<DeleteIcon />}
                            type="button"
                        >
                            Delete
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
                                const verdict =
                                    newznabCategoryValidator(category);
                                return (
                                    <Chip
                                        // Flagged here too, not only inside the
                                        // expanded row: a stored token the UI
                                        // would refuse today is exactly what an
                                        // admin scanning the catalog needs to
                                        // find, and it would otherwise be
                                        // visible only after opening the row it
                                        // sits in. Icon plus accessible name,
                                        // never the colour alone (ADR-0029).
                                        aria-label={
                                            verdict === true
                                                ? undefined
                                                : `${category} — ${verdict}`
                                        }
                                        color={
                                            verdict === true
                                                ? "default"
                                                : "error"
                                        }
                                        icon={
                                            verdict === true ? undefined : (
                                                <ErrorOutlineIcon />
                                            )
                                        }
                                        key={category}
                                        label={category}
                                        size="small"
                                        title={
                                            verdict === true
                                                ? undefined
                                                : verdict
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
            <TableRow>
                <TableCell
                    colSpan={columnCount}
                    // The expansion is a container, not a cell of data: its own
                    // padding and bottom rule would draw a second frame around
                    // the fields the `Collapse` already sets apart, and a
                    // collapsed row would still show that rule with nothing
                    // under it. No padding of its own either -- the measured
                    // width below is the container's, and `box-sizing:
                    // border-box` (CssBaseline) makes it exact only if the
                    // padding is inside the measured box.
                    sx={{borderBottom: "none", p: 0}}
                >
                    <Collapse
                        // No `unmountOnExit`: see this module's doc comment.
                        // A collapsed row's fields stay registered with
                        // `C-CONFIG-FORM`, so a blank required name still
                        // blocks the save *and* still renders its message.
                        id={`config-category-fields-${index}`}
                        in={expanded}
                    >
                        <Box
                            data-testid={`config-category-fields-box-${index}`}
                            sx={{
                                // Pinned to the container's visible width and
                                // held at its left edge while the summary
                                // columns scroll under it -- see `fieldsWidth`
                                // in `CategoriesTable` for why a cell of this
                                // table would otherwise put the right-hand edge
                                // of every input off-canvas at 390px.
                                left: 0,
                                position: "sticky",
                                px: 2,
                                py: 2,
                                ...(fieldsWidth === null
                                    ? {}
                                    : {width: fieldsWidth}),
                            }}
                        >
                            <CategoryEntryFields index={index} />
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}
