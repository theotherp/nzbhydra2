import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
    Box,
    Button,
    Chip,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableSortLabel,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import {memo, useMemo, useState, type ReactElement} from "react";
import {useWatch} from "react-hook-form";

import type {IndexerValues} from "../../../api/config/indexers";
import type {ConfigValues} from "../../../api/config/schema";
import {TableScrollAffordance} from "../../../components/table/TableScrollAffordance";
import {NumberSetting, SelectSetting} from "../components";
import {SettingRowTableCellScope} from "../components/SettingRow";
import {IndexerStateSwitch} from "./IndexerStateSwitch";
import {
    filterIndexers,
    indexerFieldPath,
    indexerLegend,
    indexerStateHelp,
    INDEXER_SORT_OPTIONS,
    indexerSortFromValue,
    indexerSortValue,
    indexerTypeLabel,
    nextIndexerSort,
    SEARCH_SOURCE_OPTIONS,
    sortIndexers,
    vipExpiryWarning,
    visibleIndexerFields,
    type IndexerSort,
    type IndexerSortKey,
    type OrderedIndexer,
} from "./indexerSettings";

const CONFIG_INCOMPLETE_MARKER = "Config incomplete";
const CAPS_INCOMPLETE_MARKER = "Caps check incomplete";

/**
 * FM-168. What the *table* reads about an entry — which is everything the tab
 * outside a row needs, and nothing else.
 *
 * The list surface asks exactly three questions of the configuration array:
 * how many entries there are, what order they go in (`sortIndexers`: `state`,
 * `score`, and `name` as the tie-break) and which of them a filter keeps
 * (`filterIndexers`, on the name). Every *other* value a row paints or edits —
 * its type, its markers, its search source, its switch, its priority field —
 * is subscribed inside the row that renders it, so a keystroke in one cell
 * cannot reach any other row.
 *
 * The fields are typed `unknown` because that is what they are: `IndexerValues`
 * is an open record (ADR-0003) and the helpers this feeds coerce each value
 * themselves.
 */
export type IndexerListEntry = {
    name: unknown;
    score: unknown;
    state: unknown;
};

/**
 * The entry fields a row *paints* — as opposed to the ones its controls bind
 * to, which each subscribe themselves through `useController`.
 *
 * Named one path at a time rather than watching `indexers.<index>` whole for
 * two reasons. React Hook Form matches a subscription to a changed field by
 * string prefix, so a watch on `indexers.1` is also woken by every change under
 * `indexers.10`; and a watch on the whole entry would be woken by the row's own
 * priority keystrokes, which `NumberSetting` already owns and which change
 * nothing this list of fields decides.
 */
const ROW_DISPLAY_FIELDS = [
    "allCapsChecked",
    "configComplete",
    "name",
    "searchModuleType",
    "state",
    "vipExpirationDate",
] as const;

/**
 * The columns, in painted order. `sortKey` marks the three that are sortable;
 * the other two carry values that are not orderings a reader would ask for.
 */
const COLUMNS: readonly {
    label: string;
    sortKey?: IndexerSortKey;
}[] = [
    {label: "Indexer", sortKey: "name"},
    {label: "Type"},
    {label: "Used for"},
    {label: "State", sortKey: "state"},
    {label: "Priority", sortKey: "priority"},
];

/**
 * `F-CONFIG-INDEXERS`' list surface (FM-103): legacy's stack of button-rows —
 * and the React `IndexerRow` stack that replaced it — as one table.
 *
 * Every control still edits the *configuration* directly, as legacy does: the
 * name is the button that opens the editor, and the search-source select, the
 * state switch and the priority field are one-click edits that mark the shell's
 * form dirty and are persisted by its Save. What the table adds is a name
 * filter, header sorting and a bulk enable/disable over whatever is currently
 * shown.
 *
 * **The one invariant.** A row's display position and its entry's
 * configuration index are different numbers, and only the latter ever reaches a
 * control: every binding here is `indexerFieldPath(row.index, …)`, where
 * `row.index` came from the entry's position in the form array, never from the
 * sorted or filtered list it is being painted in. Sorting and filtering choose
 * *which rows appear and where*; they can never choose *what a row writes to*.
 */
export function IndexerTable({
    entries,
    onEdit,
    onSetStates,
}: {
    /**
     * The ordering projection, in configuration order. See
     * `IndexerListEntry`: the table is deliberately not given the entries
     * themselves, so that a change to a field only a row paints cannot
     * re-render the table at all.
     */
    entries: readonly IndexerListEntry[];
    /**
     * Opens the editor for a configuration index. Must be referentially
     * stable: it is a prop of the memoized rows.
     */
    onEdit: (index: number) => void;
    /** One form write setting `state` on exactly the named config indices. */
    onSetStates: (indices: readonly number[], enabled: boolean) => void;
}) {
    /**
     * ADR-0029, applied to this table. Five columns need about 900px, so at
     * 390px State and Priority — the two the tab exists to *edit* — sat
     * off-canvas behind a horizontal scroll with no affordance, which is
     * exactly the rendering ADR-0029 refused for the review panel.
     *
     * Dropping the two descriptive columns was measured and is not enough: the
     * two remaining width floors are the marker chips (`VIP access expired on
     * 2000-01-01` is over 200px and a chip label cannot wrap) and the
     * search-source control's own text. Three columns still overflowed a phone.
     * So below `sm` the table keeps one column and each entry stacks — the same
     * rows, the same bindings, the same test ids, nothing hidden and nothing
     * truncated — and the sorting the column headers offer moves into a named
     * control in the toolbar, where each ordering can say what it means in
     * words.
     *
     * Decided in JavaScript rather than by CSS `display`, as `ConfigNav` and
     * `RefineSidebar` decide theirs: these cells hold real form controls bound
     * to configuration paths, and rendering both variants would put two
     * controls on each path and two copies of every `data-testid` in the
     * document.
     */
    const theme = useTheme();
    const compact = useMediaQuery(theme.breakpoints.down("sm"));
    const [sort, setSort] = useState<IndexerSort>(null);
    const [query, setQuery] = useState("");
    /**
     * The order actually painted, held as configuration indices, while a
     * control inside the table has focus — or `null`, meaning "follow the live
     * order".
     *
     * This is the difference between a table and a table you can type in.
     * `state` and `score` are both sort keys *and* inline-editable, so a live
     * `sort` would re-order the list on every keystroke in a priority cell and
     * on the very click that flips a switch: the row the admin is working in
     * slides out from under the cursor mid-edit. Freezing on focus and
     * releasing on blur defers the re-sort to the moment the edit is finished,
     * which is also when a reader wants to see where the row ended up.
     *
     * It is only ever a *permutation* of the live rows: it holds configuration
     * indices and nothing else, and `rows` resolves each one against the live
     * list on every render, dropping the freeze outright if the entry count
     * changed or any held index stops resolving. A frozen order can therefore
     * never show a stale value — the *values* are not held here at all. Since
     * FM-168 that is true twice over: the order-deciding fields arrive in
     * `entries` (which the tab recomputes whenever one of them changes) and
     * every other value a row shows is read by that row's own subscription.
     */
    const [frozenOrder, setFrozenOrder] = useState<readonly number[] | null>(
        null,
    );

    const rows = useMemo(() => {
        const live = sortIndexers(entries, sort);
        if (frozenOrder === null || frozenOrder.length !== live.length) {
            return live;
        }
        const byIndex = new Map(live.map((row) => [row.index, row]));
        const held = frozenOrder.map((index) => byIndex.get(index));
        return held.every((row): row is OrderedIndexer => row !== undefined)
            ? held
            : live;
    }, [entries, frozenOrder, sort]);

    const shown = useMemo(() => filterIndexers(rows, query), [rows, query]);
    const shownIndices = shown.map((row) => row.index);

    const sortBy = (key: IndexerSortKey) => {
        // A header click is a deliberate re-order, so it also ends any freeze:
        // otherwise the click would appear to do nothing until focus left the
        // table.
        setFrozenOrder(null);
        setSort((current) => nextIndexerSort(current, key));
    };

    return (
        // No layout wrapper here. ADR-0029's sideways-scrolling page came from
        // the enclosing `<fieldset>`'s `min-inline-size: min-content` carrying
        // this table's `minWidth` out to the document; that is fixed at the
        // source in `ConfigFieldset`, whose `min-width: 0` clamps the fieldset
        // itself. The `TableScrollAffordance` below owns the horizontal
        // scroll and marks whichever edge it is currently clipping.
        <>
            <Stack
                direction={{xs: "column", sm: "row"}}
                spacing={1}
                useFlexGap
                sx={{
                    alignItems: {sm: "center"},
                    flexWrap: "wrap",
                    mb: 2,
                }}
            >
                <TextField
                    // Not a `C-CONFIG-FIELDS` control: it binds to no
                    // configuration path and edits nothing. It is a view
                    // control over the list, so it is a plain stock
                    // `TextField` with its own visible label.
                    label="Filter by name"
                    onChange={(event) => setQuery(event.target.value)}
                    // On the `<input>` rather than the wrapper, as
                    // `C-CONFIG-FIELDS` controls put theirs: a test that fills
                    // this must address the element that takes a value.
                    slotProps={{
                        htmlInput: {"data-testid": "config-indexers-filter"},
                    }}
                    // The filter is a single short word in practice; wide
                    // enough for one and narrow enough that the two bulk
                    // actions sit beside it on a tablet.
                    sx={{width: {sm: 260, xs: "100%"}}}
                    type="search"
                    value={query}
                />
                {compact ? (
                    <TextField
                        // The compact table has no column headers to click, so
                        // this is where its sorting lives. Same seven
                        // orderings, named in words.
                        data-testid="config-indexers-sort"
                        label="Sort by"
                        onChange={(event) => {
                            setFrozenOrder(null);
                            setSort(indexerSortFromValue(event.target.value));
                        }}
                        select
                        sx={{width: "100%"}}
                        value={indexerSortValue(sort)}
                    >
                        {INDEXER_SORT_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                ) : null}
                <Button
                    data-testid="config-indexers-enable-shown"
                    disabled={shown.length === 0}
                    onClick={() => onSetStates(shownIndices, true)}
                    type="button"
                    variant="outlined"
                >
                    Enable shown
                </Button>
                <Button
                    data-testid="config-indexers-disable-shown"
                    disabled={shown.length === 0}
                    onClick={() => onSetStates(shownIndices, false)}
                    type="button"
                    variant="outlined"
                >
                    Disable shown
                </Button>
                <Typography
                    // What "shown" means for the two buttons beside it, and the
                    // only feedback a filter that matches nothing would
                    // otherwise give. Announced politely because filtering
                    // changes it without moving focus.
                    aria-live="polite"
                    data-testid="config-indexers-shown-count"
                    variant="body2"
                >
                    {shown.length === rows.length
                        ? `${rows.length} ${indexerWord(rows.length)}`
                        : `${shown.length} of ${rows.length} indexers shown`}
                </Typography>
            </Stack>
            {/* The five-column table is wider than a tablet, so between `sm`
                and the width it needs it scrolls *inside this container*
                rather than pushing the page into a horizontal scroll. Every
                column stays reachable and none is dropped: each one either
                identifies the indexer or is an editable setting with no other
                home on this tab. Below `sm` the compact table has no width
                floor and nothing to scroll -- measured at 390x844 it needs
                266px against a 326px container -- so `C-TABLE-SCROLL-AFFORDANCE`
                correctly shows no affordance there and only marks the clipped
                edge in the scrolling range above `sm` (ADR-0038). */}
            <TableScrollAffordance scrollerTestId="config-indexers-scroller">
                <Table
                    aria-label="Configured indexers"
                    data-testid="config-indexers-table"
                    // The five columns hold a name plus its markers and three
                    // real form controls; below 900 the controls start
                    // squeezing their own labels, so the container scrolls
                    // instead.
                    sx={{minWidth: compact ? undefined : 900}}
                >
                    <TableHead>
                        <TableRow>
                            {compact ? (
                                // One column, and its sorting is the toolbar's
                                // "Sort by" control rather than this header.
                                <TableCell>Indexer</TableCell>
                            ) : null}
                            {(compact ? [] : COLUMNS).map(
                                ({label, sortKey}) => {
                                    const active =
                                        sortKey !== undefined &&
                                        sort !== null &&
                                        sort.key === sortKey;
                                    return (
                                        <TableCell
                                            key={label}
                                            sortDirection={
                                                active && sort !== null
                                                    ? sort.direction
                                                    : false
                                            }
                                        >
                                            {sortKey === undefined ? (
                                                label
                                            ) : (
                                                <TableSortLabel
                                                    active={active}
                                                    data-testid={`config-indexers-sort-${sortKey}`}
                                                    direction={
                                                        active && sort !== null
                                                            ? sort.direction
                                                            : "asc"
                                                    }
                                                    onClick={() => {
                                                        sortBy(sortKey);
                                                    }}
                                                >
                                                    {label}
                                                </TableSortLabel>
                                            )}
                                        </TableCell>
                                    );
                                },
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody
                        // The freeze is installed here rather than on each
                        // control so that moving between two cells with the
                        // keyboard settles the order once, on the way out of
                        // the body, instead of once per cell.
                        onBlurCapture={(event) => {
                            if (
                                !event.currentTarget.contains(
                                    event.relatedTarget,
                                )
                            ) {
                                setFrozenOrder(null);
                            }
                        }}
                        onFocusCapture={() => {
                            setFrozenOrder(
                                (held) => held ?? rows.map((row) => row.index),
                            );
                        }}
                    >
                        {/*
                            Every prop here is referentially stable across an
                            unrelated row's edit -- two primitives and the
                            caller's own stable callback -- which is what makes
                            `IndexerTableRow`'s `memo` do anything. In
                            particular `onEdit` is passed straight through
                            rather than wrapped per row: a fresh closure would
                            be a new prop on every render of this table and
                            would defeat the memo silently.
                        */}
                        {shown.map((row) => (
                            <IndexerTableRow
                                compact={compact}
                                index={row.index}
                                key={row.index}
                                onEdit={onEdit}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableScrollAffordance>
            {shown.length === 0 ? (
                <Typography
                    data-testid="config-indexers-no-matches"
                    sx={{mt: 2}}
                    variant="body2"
                >
                    No indexer matches “{query}”. Clear the filter to see all{" "}
                    {rows.length} {indexerWord(rows.length)}.
                </Typography>
            ) : null}
        </>
    );
}

function indexerWord(count: number): string {
    return count === 1 ? "indexer" : "indexers";
}

/**
 * One entry's row. `index` is the entry's index in the configuration array and
 * is the only thing any control here binds to.
 *
 * Legacy signals an incomplete configuration and an incomplete capability check
 * by adding CSS classes to the name button (`config-incomplete`,
 * `not-all-checked`), which is colour alone. Each is a named chip here — an
 * icon and a word — so none of the three status dimensions this row carries
 * (usable state, configuration completeness, VIP validity) is readable only to
 * someone who can distinguish the palette.
 *
 * FM-168: memoized, and given only values that survive an edit somewhere else
 * in the list — `compact`, the entry's configuration index, and the tab's
 * stable `onEdit`. The entry itself is not a prop: the row reads the fields it
 * paints from the form directly (`ROW_DISPLAY_FIELDS`), which is what confines
 * a keystroke in one cell to the row it was typed in. The two halves are one
 * change: a memoized row handed a freshly-read array would still re-render,
 * and a narrowed subscription without the memo would still re-render every row
 * whenever the table above it did.
 */
const IndexerTableRow = memo(function IndexerTableRow({
    compact,
    index,
    onEdit,
}: {
    /** Below `sm`: Type and Used for are folded into the name cell. */
    compact: boolean;
    index: number;
    onEdit: (index: number) => void;
}) {
    const entry = useRowDisplayValues(index);
    const legend = indexerLegend(entry);
    const configComplete = entry.configComplete === true;
    const expiry = vipExpiryWarning(entry);
    const type = (
        <Typography
            data-testid={`config-indexer-type-${index}`}
            variant="body2"
        >
            {indexerTypeLabel(entry.searchModuleType)}
        </Typography>
    );
    // ADR-0040: the cell is offered exactly where the editor offers the field.
    // `visibleIndexerFields` withholds it for TORBOX, whose search source is
    // not the admin's to choose, so the list must not offer it either. The
    // column stays — the cell is simply empty for such a row, as the dialog
    // leaves the field out of its own layout rather than rearranging it.
    const showsSearchSource = visibleIndexerFields(
        entry.searchModuleType,
    ).includes("enabledForSearchSource");
    const searchSource = !showsSearchSource ? null : (
        <SelectSetting
            // The dialog's own "Enable for..." field, brought onto the list
            // because it decides whether an *enabled* indexer is actually
            // consulted by the search the admin is looking at. Deliberately
            // not `advanced` as it is there: a column the global toggle
            // empties would leave a headed, blank cell in every row.
            label="Used for"
            name={indexerFieldPath(index, "enabledForSearchSource")}
            options={SEARCH_SOURCE_OPTIONS}
        />
    );
    const nameButton = (
        <Button
            data-testid={`config-indexer-edit-${index}`}
            onClick={() => onEdit(index)}
            sx={{
                // A name is free text and a few of the presets' are long;
                // past this the name column would push every control off a
                // laptop screen. The full value stays available as the
                // button's title, and the editor it opens shows it in
                // full. Compact, the cell is the whole width of the page,
                // so the cell itself is the cap.
                maxWidth: compact ? "100%" : 260,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
            }}
            title={legend}
            type="button"
            variant="outlined"
        >
            {legend}
        </Button>
    );
    // Up to three markers, each optional. Built once, exactly as before —
    // only where they are placed differs between the two layouts below.
    const nameChips = [
        configComplete ? null : (
            <Chip
                color="error"
                data-testid={`config-indexer-incomplete-${index}`}
                icon={<ErrorOutlineOutlinedIcon />}
                key="incomplete"
                label={CONFIG_INCOMPLETE_MARKER}
                size="small"
                variant="outlined"
            />
        ),
        configComplete && entry.allCapsChecked !== true ? (
            <Chip
                color="warning"
                data-testid={`config-indexer-caps-incomplete-${index}`}
                icon={<HelpOutlineOutlinedIcon />}
                key="caps-incomplete"
                label={CAPS_INCOMPLETE_MARKER}
                size="small"
                variant="outlined"
            />
        ) : null,
        expiry === undefined ? null : (
            <Chip
                color="warning"
                data-testid={`config-indexer-vip-warning-${index}`}
                icon={<WarningAmberIcon />}
                key="vip-warning"
                label={expiry}
                size="small"
                variant="outlined"
            />
        ),
    ].filter((chip): chip is ReactElement => chip !== null);
    // The name cell's one arrangement, wide or compact alike: chips flow
    // normally below the button. FM-151 lifted the wide row's chips out of
    // flow (`position: absolute; top: 100%`) so a chip-bearing name never
    // grew past the button's own height, keeping this cell's control exactly
    // on the row's shared centerline with the other four. Nothing reserved
    // the space the lifted chips still occupied visually, so they crossed
    // the `TableCell`'s bottom border into the row below — the owner
    // reported that overlap (2026-09-01) and judged it worse than letting a
    // chip-bearing row grow. This reverses the lift: a chip-bearing wide row
    // now sits taller than a chipless one, and the name button in that row
    // sits above — not on — the row's vertical center, same as the compact
    // branch has always rendered it.
    const name = (
        <Stack
            spacing={0.5}
            sx={{
                alignItems: "flex-start",
            }}
        >
            {nameButton}
            {nameChips}
        </Stack>
    );
    const state = (
        <IndexerStateSwitch
            configComplete={configComplete}
            help={indexerStateHelp(entry.state)}
            label={`State of ${legend}`}
            name={indexerFieldPath(index, "state")}
        />
    );
    const priority = (
        <NumberSetting
            label="Priority"
            name={indexerFieldPath(index, "score")}
            required
        />
    );
    if (compact) {
        // The same five pieces, stacked in one cell instead of spread across
        // five columns. `type`, `searchSource`, `state` and `priority` are
        // each built once above and placed once, in exactly one of the two
        // branches; `name` (below) is shared by both branches unchanged —
        // `nameButton` and each chip are still each built exactly once.
        return (
            <TableRow data-testid={`config-indexer-entry-${index}`}>
                <TableCell>
                    <Stack
                        spacing={1}
                        sx={{
                            alignItems: "flex-start",
                        }}
                    >
                        {name}
                        {type}
                        {/*
                         * The three controls each fill the cell: on a phone
                         * the cell *is* the column, so a control narrower
                         * than it would be a design decision with nothing
                         * behind it.
                         */}
                        {searchSource === null ? null : (
                            <Box sx={{width: "100%"}}>{searchSource}</Box>
                        )}
                        <Box sx={{width: "100%"}}>{state}</Box>
                        <Box sx={{width: "100%"}}>{priority}</Box>
                    </Stack>
                </TableCell>
            </TableRow>
        );
    }
    return (
        <TableRow data-testid={`config-indexer-entry-${index}`}>
            <TableCell>{name}</TableCell>
            <TableCell>{type}</TableCell>
            <TableCell>
                <SettingRowTableCellScope>
                    {searchSource}
                </SettingRowTableCellScope>
            </TableCell>
            <TableCell>
                <SettingRowTableCellScope>{state}</SettingRowTableCellScope>
            </TableCell>
            <TableCell>
                <SettingRowTableCellScope>{priority}</SettingRowTableCellScope>
            </TableCell>
        </TableRow>
    );
});

/**
 * The row's own view of its entry: `ROW_DISPLAY_FIELDS`, read from the form and
 * re-read whenever one of them changes — and only then.
 *
 * The result is shaped as an `IndexerValues` because that is what
 * `indexerLegend`, `vipExpiryWarning` and `indexerTypeLabel` take; it is a
 * projection of the entry, not the entry, and deliberately carries nothing a
 * row does not paint. A whole-array write (a bulk enable, an import, a caps
 * merge, an add or a delete) signals the array path itself, which is a prefix
 * of all six names, so those still reach every row.
 */
function useRowDisplayValues(index: number): IndexerValues {
    const names = useMemo(
        () => ROW_DISPLAY_FIELDS.map((field) => indexerFieldPath(index, field)),
        [index],
    );
    const values = useWatch<ConfigValues>({name: names}) as readonly unknown[];
    return useMemo(
        () =>
            Object.fromEntries(
                ROW_DISPLAY_FIELDS.map((field, at) => [field, values[at]]),
            ),
        [values],
    );
}
