import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Chip,
    Collapse,
    FormControlLabel,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import type {ReactNode} from "react";
import {Controller, useForm} from "react-hook-form";
import {useEffect, useId, useRef, useState} from "react";

import type {MediaSuggestion} from "../../../api/media";
import type {CategoryCatalog} from "../../../domain/categories/catalog";
import {readItem, writeItem} from "../../../domain/storage/browserStorage";
import {AdvancedRangeInput, rangeFieldWidth} from "./AdvancedRangeInput";
import {IndexerSelectionButton} from "./IndexerSelectionButton";
import type {SearchFormValues} from "./searchFormModel";
import {
    hasIdentifier,
    identifierFields,
    mediaTypeForCategoryName,
} from "./searchFormModel";
import {
    SeasonEpisodeInput,
    seasonEpisodeFieldWidth,
} from "./SeasonEpisodeInput";

const defaultAutocomplete = async (): Promise<MediaSuggestion[]> => [];

/** The field a chip (or a chosen suggestion) opens the Advanced panel for. */
type AdvancedField =
    | "additionalQuery"
    | "episode"
    | "indexers"
    | "minage"
    | "minsize"
    | "season";

const advancedOpenStorageKey = "nzbhydra.search.advancedOpen";

// `domain/storage/browserStorage` absorbs every way `localStorage` can fail,
// so a missing or refused store simply means "closed" rather than a broken
// search form.
function readAdvancedOpen(): boolean {
    return readItem(advancedOpenStorageKey) === "true";
}

function persistAdvancedOpen(open: boolean): void {
    // The disclosure still opens and closes; only the memory is lost.
    writeItem(advancedOpenStorageKey, String(open));
}

function rangeLabel(
    name: string,
    min: string,
    max: string,
    unit: string,
): string {
    if (min !== "" && max !== "") {
        return `${name} ${min}–${max} ${unit}`;
    }
    return min !== "" ? `${name} ≥ ${min} ${unit}` : `${name} ≤ ${max} ${unit}`;
}

const advancedSectionSx = {
    display: "flex",
    flexDirection: "column",
    gap: 0.75,
} as const;
// The Media section is exactly as wide as its Season + Episode pair (two
// fields plus the 10px `spacing={1.25}` gutter), so the additional-filter
// field below them fills the same width and the section reads as one block.
const mediaSectionWidth = seasonEpisodeFieldWidth * 2 + 10;
// Two range fields plus their 6px `gap: 0.75` gutter, so Age & Size wraps
// into a 2x2 block on a wide panel and a single column on a narrow one.
const rangeSectionWidth = rangeFieldWidth * 2 + 6;
// The chips row renders whenever Advanced is open or at least one chip has
// something to show (`advancedOpen || hasChips`; FM-146, owner revision
// 2026-08-30 of FM-143's same-day "always rendered" rule). While Advanced is
// open the row still reserves one empty row so the first constraint chip no
// longer pushes the panel down and the last one's removal no longer snaps it
// back up (FM-143's original fix, unchanged). While Advanced is collapsed
// and empty the row is omitted instead, so the initial form has no empty
// band between the input row and the "Recent searches" footer; active
// constraints still force the row into view even while collapsed, since
// `hasChips` is true whenever any chip below would render. Deleting the last
// chip while collapsed removes the row and moves the footer up in the same
// click. That transition -- like the Advanced toggle's -- is governed by the
// row's own `Collapse` (FM-149, owner follow-up 2026-08-30 revising FM-146's
// "no `Collapse`/animation smoothing it" boundary): the row's space animates
// on exactly the same predicate and duration as the panel beside it, so a
// toggle with no chips reads as one motion instead of the panel's top
// hairline blinking 42px into place ahead of it. The reserved height is
// exactly one row at MUI's default medium `Chip` height (verified against the
// installed `@mui/material/Chip` source and the `constraint` variant in
// `theme.ts`, which overrides colour and typography but not height).
const chipsRowMinHeight = 32;
// The row's separation from the input row above it, and the row's full
// reserved height including it. The gap has to live *inside* the collapsing
// element rather than as a margin above it: `Collapse` animates the measured
// height of its wrapper, and a top margin on the wrapper's only child
// collapses through `MuiCollapse-wrapperInner` and is excluded from that
// measurement, which would leave the 10px snapping into place in one frame
// at the end of an otherwise smooth animation. Delivered as `pt` with the
// padding counted into `minHeight` (global `box-sizing: border-box`), so the
// row's total is the same 42px it was as `mt: 1.25` + `minHeight: 32`.
const chipsRowTopGap = 10;
const chipsRowReservedHeight = chipsRowMinHeight + chipsRowTopGap;

export function SearchWorkspace({
    catalog,
    initialValues,
    onSubmit,
    autocomplete = defaultAutocomplete,
    showIndexerSelection = false,
    indexerSelectionAsCheckboxes = false,
    onSearchDrop,
    historyTool,
}: {
    catalog: CategoryCatalog;
    initialValues: SearchFormValues;
    onSubmit(values: SearchFormValues): void;
    autocomplete?(
        type: "MOVIE" | "TV",
        input: string,
    ): Promise<MediaSuggestion[]>;
    showIndexerSelection?: boolean;
    indexerSelectionAsCheckboxes?: boolean;
    onSearchDrop?(): void;
    historyTool?: ReactNode;
}) {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        formState: {errors},
    } = useForm<SearchFormValues>({defaultValues: initialValues});
    const selectedCategory = watch("category");
    const title = watch("title");
    const values = watch();
    const [suggestions, setSuggestions] = useState<MediaSuggestion[]>([]);
    // "Nothing found" is deliberately not a state: mid-typing, an absent
    // dropdown already says it, and a status Alert flashing into the form on
    // every debounced miss was distracting (owner feedback, 2026-08-23).
    // Loading renders as a spinner inside the field for the same reason;
    // only the rare failure states surface as Alerts.
    const [autocompleteState, setAutocompleteState] = useState<
        "idle" | "loading" | "error" | "malformed"
    >("idle");
    const [activeOption, setActiveOption] = useState(-1);
    const [advancedOpen, setAdvancedOpen] = useState(readAdvancedOpen);
    const [pendingFocus, setPendingFocus] = useState<AdvancedField | null>(
        null,
    );
    // The chosen suggestion's release year, for the matched-title chip's
    // label. Kept as local state rather than a form field on purpose: the
    // form schema, `valuesFromSearch`, and `canonicalSearch` are unchanged by
    // this redesign, and the year is not part of a search request, so a
    // restored URL simply renders the chip without one.
    const [selectedYear, setSelectedYear] = useState("");
    const request = useRef(0);
    const searchQueryFieldRef = useRef<HTMLInputElement | null>(null);
    const autocompleteContainerRef = useRef<HTMLDivElement | null>(null);
    const additionalQueryFieldRef = useRef<HTMLInputElement | null>(null);
    const seasonFieldRef = useRef<HTMLInputElement | null>(null);
    const episodeFieldRef = useRef<HTMLInputElement | null>(null);
    const minageFieldRef = useRef<HTMLInputElement | null>(null);
    const minsizeFieldRef = useRef<HTMLInputElement | null>(null);
    const indexersFieldsRef = useRef<HTMLDivElement | null>(null);
    const isFirstCategoryRender = useRef(true);
    const listboxId = useId();
    const advancedPanelId = useId();
    const mediaType = mediaTypeForCategoryName(catalog, selectedCategory);
    const selected = hasIdentifier(values);
    // The Advanced panel is a `Collapse`: while it is collapsed its content
    // is rendered but `visibility: hidden`, and focusing a hidden element is
    // a silent no-op. Every "open Advanced and focus X" path therefore only
    // records the wanted field and lets this effect move focus once the panel
    // is actually expanded.
    useEffect(() => {
        if (!advancedOpen || pendingFocus === null) {
            return;
        }
        if (pendingFocus === "indexers") {
            indexersFieldsRef.current
                ?.querySelector<HTMLElement>(
                    '[role="combobox"], input[type="checkbox"]',
                )
                ?.focus();
        } else {
            const field = {
                additionalQuery: additionalQueryFieldRef,
                episode: episodeFieldRef,
                minage: minageFieldRef,
                minsize: minsizeFieldRef,
                season: seasonFieldRef,
            }[pendingFocus];
            field.current?.focus();
        }
        setPendingFocus(null);
    }, [advancedOpen, pendingFocus]);
    useEffect(() => {
        const current = ++request.current;
        if (!mediaType || selected || title.trim().length < 2) {
            setSuggestions([]);
            setAutocompleteState("idle");
            return;
        }
        const timeout = window.setTimeout(() => {
            setAutocompleteState("loading");
            void autocomplete(mediaType, title).then(
                (next) => {
                    if (request.current !== current) {
                        return;
                    }
                    setSuggestions(next);
                    setActiveOption(-1);
                    setAutocompleteState("idle");
                },
                (error: unknown) => {
                    if (request.current !== current) {
                        return;
                    }
                    setSuggestions([]);
                    setAutocompleteState(
                        error instanceof Error &&
                            error.message.includes("invalid format")
                            ? "malformed"
                            : "error",
                    );
                },
            );
        }, 300);
        return () => window.clearTimeout(timeout);
    }, [autocomplete, mediaType, selected, title]);
    useEffect(() => {
        if (isFirstCategoryRender.current) {
            isFirstCategoryRender.current = false;
            return;
        }
        searchQueryFieldRef.current?.focus();
    }, [selectedCategory]);
    // A mousedown on an autocomplete option itself doesn't reach here: the
    // option's own `onMouseDown` already calls `preventDefault()`, but that
    // only suppresses the browser's default blur/selection behavior -- it
    // does not stop this bubbling listener, so an option click is still
    // seen here and still closes the dropdown correctly via `contains()`
    // finding the option inside `autocompleteContainerRef`.
    useEffect(() => {
        if (suggestions.length === 0) {
            return;
        }
        const closeIfOutside = (event: MouseEvent) => {
            if (
                !autocompleteContainerRef.current?.contains(
                    event.target as Node,
                )
            ) {
                setSuggestions([]);
            }
        };
        document.addEventListener("mousedown", closeIfOutside);
        return () => document.removeEventListener("mousedown", closeIfOutside);
    }, [suggestions.length]);
    const clearSelection = () => {
        request.current++;
        setSelectedYear("");
        for (const key of identifierFields) {
            setValue(key, "");
        }
    };
    // Opening Advanced from a chip or from a chosen suggestion is not the
    // disclosure's own toggle, so it deliberately does not persist (the
    // design doc's persistence rule: the toggle writes, auto-open does not).
    const revealAdvanced = (field: AdvancedField) => {
        setAdvancedOpen(true);
        setPendingFocus(field);
    };
    const toggleAdvanced = () => {
        const open = !advancedOpen;
        setAdvancedOpen(open);
        persistAdvancedOpen(open);
    };
    const chooseSuggestion = (suggestion: MediaSuggestion) => {
        request.current++;
        setValue("title", suggestion.title);
        setSelectedYear(suggestion.year ? String(suggestion.year) : "");
        for (const key of identifierFields) {
            setValue(key, suggestion[key] ?? "");
        }
        setSuggestions([]);
        setActiveOption(-1);
        // A TV suggestion hands the user straight to Season (the legacy
        // form's convenience); a movie keeps the previous jump to the
        // additional filter, which now lives in the Advanced panel, so both
        // open the panel first.
        revealAdvanced(mediaType === "TV" ? "season" : "additionalQuery");
    };
    const categoryChanged = (category: string) => {
        request.current++;
        setValue("category", category);
        clearSelection();
        setValue("title", "");
        setValue("additionalQuery", "");
        const selected = catalog.categories.find(
            (entry) => entry.name === category,
        );
        if (catalog.enableCategorySizes) {
            setValue("minsize", selected?.minSizePreset?.toString() ?? "");
            setValue("maxsize", selected?.maxSizePreset?.toString() ?? "");
        }
    };
    const eligibleIndexers = catalog.eligibleIndexers(selectedCategory);
    const selectedIndexers = watch("indexers");
    const noIndexers = selectedIndexers.length === 0;
    const selectIndexers = (names: string[]) => setValue("indexers", names);
    const resetIndexers = (category = selectedCategory) =>
        selectIndexers(catalog.preselectedIndexerNames(category));
    const searchAdornment = (
        <InputAdornment position="start">
            <SearchIcon fontSize="small" />
        </InputAdornment>
    );
    const {
        ref: titleFieldRef,
        onBlur: titleOnBlur,
        ...titleRegistration
    } = register("title", {
        onChange: () => {
            request.current++;
            if (selected) {
                clearSelection();
            }
        },
    });
    const {ref: queryFieldRef, ...queryRegistration} = register("query");
    const {
        ref: additionalQueryRegistrationRef,
        ...additionalQueryRegistration
    } = register("additionalQuery");
    const setAdditionalQueryInputRef = (element: HTMLInputElement | null) => {
        additionalQueryRegistrationRef(element);
        additionalQueryFieldRef.current = element;
    };
    const setTitleInputRef = (element: HTMLInputElement | null) => {
        titleFieldRef(element);
        searchQueryFieldRef.current = element;
    };
    const setQueryInputRef = (element: HTMLInputElement | null) => {
        queryFieldRef(element);
        searchQueryFieldRef.current = element;
    };
    const queryInput = mediaType ? (
        <TextField
            fullWidth
            onBlur={(event) => {
                titleOnBlur(event);
                setSuggestions([]);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onSearchDrop}
            onKeyDown={(event) => {
                if (event.key === "ArrowDown" && suggestions.length) {
                    event.preventDefault();
                    setActiveOption((current) =>
                        Math.min(current + 1, suggestions.length - 1),
                    );
                } else if (event.key === "ArrowUp" && suggestions.length) {
                    event.preventDefault();
                    setActiveOption((current) => Math.max(current - 1, 0));
                } else if (event.key === "Enter" && activeOption >= 0) {
                    event.preventDefault();
                    chooseSuggestion(suggestions[activeOption]);
                } else if (event.key === "Escape") {
                    setSuggestions([]);
                }
            }}
            placeholder="Search…"
            type="search"
            slotProps={{
                input: {
                    startAdornment: searchAdornment,
                    endAdornment:
                        autocompleteState === "loading" ? (
                            <InputAdornment position="end">
                                <CircularProgress
                                    aria-label="Loading title suggestions"
                                    size={16}
                                />
                            </InputAdornment>
                        ) : undefined,
                },
                htmlInput: {
                    "aria-activedescendant":
                        activeOption >= 0
                            ? `${listboxId}-${activeOption}`
                            : undefined,
                    "aria-controls": suggestions.length ? listboxId : undefined,
                    "aria-label": "Search",
                    "data-testid": "search-query",
                },
            }}
            inputRef={setTitleInputRef}
            {...titleRegistration}
        />
    ) : (
        <TextField
            fullWidth
            onDragOver={(event) => event.preventDefault()}
            onDrop={onSearchDrop}
            placeholder="Search…"
            type="search"
            slotProps={{
                input: {startAdornment: searchAdornment},
                htmlInput: {
                    "aria-label": "Search",
                    "data-testid": "search-query",
                },
            }}
            inputRef={setQueryInputRef}
            {...queryRegistration}
        />
    );
    // Every constraint that affects the search but is not visible in the
    // input row renders as a live chip, so nothing is hidden behind the
    // collapsed Advanced panel. `selectedIndexers` is always reconciled to a
    // subset of `eligibleIndexers` (`indexersFromSearch`, the category
    // change handler, and every bulk action pick from that list), so an
    // equal length is exactly "all eligible indexers are selected".
    const showIndexersChip =
        showIndexerSelection &&
        eligibleIndexers.length > 0 &&
        selectedIndexers.length !== eligibleIndexers.length;
    // The single source both the row's presence and its contents read from
    // (owner revision 2026-08-30 of FM-143's always-render rule): every
    // predicate here is the exact one guarding its `<Chip>` below, not a
    // paraphrase, so the row and the chips it holds can never disagree.
    const hasChips =
        selected ||
        (mediaType === "TV" && values.season !== "") ||
        (mediaType === "TV" && values.episode !== "") ||
        values.minage !== "" ||
        values.maxage !== "" ||
        values.minsize !== "" ||
        values.maxsize !== "" ||
        values.additionalQuery !== "" ||
        showIndexersChip;
    const chips = (
        <>
            {selected && (
                <Chip
                    data-testid="search-chip-title"
                    label={`● ${title}${selectedYear ? ` (${selectedYear})` : ""}`}
                    onClick={() => revealAdvanced("additionalQuery")}
                    onDelete={clearSelection}
                    variant="constraint"
                />
            )}
            {mediaType === "TV" && values.season !== "" && (
                <Chip
                    data-testid="search-chip-season"
                    label={`S ${values.season}`}
                    onClick={() => revealAdvanced("season")}
                    onDelete={() => setValue("season", "")}
                    variant="constraint"
                />
            )}
            {mediaType === "TV" && values.episode !== "" && (
                <Chip
                    data-testid="search-chip-episode"
                    label={`E ${values.episode}`}
                    onClick={() => revealAdvanced("episode")}
                    onDelete={() => setValue("episode", "")}
                    variant="constraint"
                />
            )}
            {(values.minage !== "" || values.maxage !== "") && (
                <Chip
                    data-testid="search-chip-age"
                    label={rangeLabel("Age", values.minage, values.maxage, "d")}
                    onClick={() => revealAdvanced("minage")}
                    onDelete={() => {
                        setValue("minage", "");
                        setValue("maxage", "");
                    }}
                    variant="constraint"
                />
            )}
            {(values.minsize !== "" || values.maxsize !== "") && (
                <Chip
                    data-testid="search-chip-size"
                    label={rangeLabel(
                        "Size",
                        values.minsize,
                        values.maxsize,
                        "MB",
                    )}
                    onClick={() => revealAdvanced("minsize")}
                    onDelete={() => {
                        setValue("minsize", "");
                        setValue("maxsize", "");
                    }}
                    variant="constraint"
                />
            )}
            {values.additionalQuery !== "" && (
                <Chip
                    data-testid="search-chip-filter"
                    label={`Filter: ${values.additionalQuery}`}
                    onClick={() => revealAdvanced("additionalQuery")}
                    onDelete={() => setValue("additionalQuery", "")}
                    variant="constraint"
                />
            )}
            {showIndexersChip && (
                <Chip
                    color={noIndexers ? "warning" : "default"}
                    data-testid="search-chip-indexers"
                    label={`Indexers ${selectedIndexers.length}/${eligibleIndexers.length}`}
                    onClick={() => revealAdvanced("indexers")}
                    variant="constraint"
                />
            )}
        </>
    );
    return (
        <Paper
            component="form"
            data-testid="search-workspace"
            elevation={1}
            onSubmit={handleSubmit(onSubmit)}
            // One surface for the whole card (the mock's bar tone), zoned
            // only by the horizontal hairlines below -- the previous
            // bar-on-paper two-tone split read as two unrelated panels.
            // `backgroundImage: "none"` drops MUI's dark-mode elevation
            // tint so the color is exactly the token. The Paper stays
            // unclipped (no `overflow: hidden`) so the absolutely-positioned
            // autocomplete dropdown can overlap the form's lower zone.
            sx={{
                backgroundColor: "surfaces.bar",
                backgroundImage: "none",
                // The form reads better as a focused command surface than a
                // full-bleed band (owner decision 2026-08-23): centered, and
                // capped between the mock page's 880px column and the
                // shell's 1700px content width. Results below stay wide --
                // the two widths are deliberately different.
                maxWidth: 1100,
                // Centered via `alignSelf`, not `mx: "auto"`: the page
                // renders this form as a child of a spacing `Stack`, whose
                // own `& > :not(style):not(style) {margin: 0}` child reset
                // outweighs the sx class and zeroes auto margins (measured
                // live at 1920px -- x stayed 150 with `mx`, 410 with
                // `alignSelf`). `align-self` is not a margin, so the reset
                // cannot touch it.
                alignSelf: "center",
                mt: 3,
                width: "100%",
            }}
        >
            <Box
                data-testid="workspace-primary"
                sx={{
                    borderBottom: "1px solid",
                    borderColor: "surfaces.hairlineFaint",
                    px: 2,
                    py: 1.75,
                }}
            >
                <Box
                    sx={{
                        alignItems: "center",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 1.25,
                    }}
                >
                    <Controller
                        control={control}
                        name="category"
                        render={({field}) => (
                            <TextField
                                data-testid="search-category-control"
                                label="Category"
                                select
                                sx={{
                                    flexGrow: {xs: 1, sm: 0},
                                    flexShrink: 0,
                                    minWidth: 150,
                                }}
                                {...field}
                                onChange={(event) => {
                                    const category = event.target.value;
                                    categoryChanged(category);
                                    const eligible = new Set(
                                        catalog
                                            .eligibleIndexers(category)
                                            .map((indexer) => indexer.name),
                                    );
                                    selectIndexers(
                                        selectedIndexers.filter((name) =>
                                            eligible.has(name),
                                        ),
                                    );
                                }}
                            >
                                {catalog.categories.map((category) => (
                                    <MenuItem
                                        data-testid={`search-category-option-${category.name}`}
                                        key={category.name}
                                        value={category.name}
                                    >
                                        {category.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    />
                    <Box
                        ref={autocompleteContainerRef}
                        sx={{
                            alignItems: "center",
                            display: "flex",
                            flex: 1,
                            gap: 1.25,
                            minWidth: 260,
                            position: "relative",
                        }}
                    >
                        {queryInput}
                        <Button
                            data-testid="search-submit"
                            sx={{flexShrink: 0, px: 3}}
                            type="submit"
                            variant="contained"
                        >
                            Search
                        </Button>
                        {suggestions.length > 0 && (
                            <Paper
                                component="ul"
                                data-testid="autocomplete-popup"
                                elevation={8}
                                id={listboxId}
                                role="listbox"
                                sx={{
                                    backgroundColor: "surfaces.control",
                                    backgroundImage: "none",
                                    border: "1px solid",
                                    borderColor: "surfaces.hairline",
                                    left: 0,
                                    listStyle: "none",
                                    m: 0,
                                    // Capped and scrollable rather than
                                    // growing to fit every suggestion, which
                                    // could otherwise run past the viewport.
                                    // `overflowX: hidden` (not the previous
                                    // blanket `overflow: hidden`) keeps the
                                    // option rows' hover/selected background
                                    // clipped to the rounded corners on the
                                    // sides while still allowing a vertical
                                    // scrollbar; the form's own
                                    // `overflow: hidden` no longer clips this
                                    // element's bottom (see
                                    // `workspace-primary`), so the list can
                                    // overlap the rest of the form instead of
                                    // being cut off by it.
                                    maxHeight: 360,
                                    overflowX: "hidden",
                                    overflowY: "auto",
                                    p: 0.75,
                                    position: "absolute",
                                    right: 0,
                                    top: "calc(100% + 6px)",
                                    zIndex: 40,
                                }}
                            >
                                {suggestions.map((suggestion, index) => (
                                    <Box
                                        component="li"
                                        data-testid="autocomplete-option"
                                        data-tmdb-id={suggestion.tmdbId}
                                        id={`${listboxId}-${index}`}
                                        key={`${suggestion.title}-${index}`}
                                        role="option"
                                        aria-selected={activeOption === index}
                                        tabIndex={-1}
                                        onMouseDown={(event) =>
                                            event.preventDefault()
                                        }
                                        onClick={() =>
                                            chooseSuggestion(suggestion)
                                        }
                                        sx={{
                                            alignItems: "center",
                                            borderRadius: 1,
                                            cursor: "pointer",
                                            display: "flex",
                                            gap: 1,
                                            px: 1.25,
                                            py: 1,
                                            bgcolor:
                                                activeOption === index
                                                    ? "action.selected"
                                                    : undefined,
                                            "&:hover": {
                                                bgcolor: "action.hover",
                                            },
                                        }}
                                    >
                                        {suggestion.posterUrl && (
                                            <Box
                                                alt=""
                                                component="img"
                                                src={suggestion.posterUrl}
                                                sx={{
                                                    borderRadius: 0.5,
                                                    flexShrink: 0,
                                                    width: 32,
                                                }}
                                            />
                                        )}
                                        <Box component="span">
                                            {suggestion.title}
                                            {suggestion.year
                                                ? ` (${suggestion.year})`
                                                : ""}
                                        </Box>
                                    </Box>
                                ))}
                            </Paper>
                        )}
                    </Box>
                    <IconButton
                        aria-controls={advancedPanelId}
                        aria-expanded={advancedOpen}
                        aria-label="Advanced"
                        color={advancedOpen ? "primary" : "default"}
                        data-testid="search-advanced-toggle"
                        onClick={toggleAdvanced}
                        sx={{flexShrink: 0}}
                    >
                        {advancedOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </Box>
                <Collapse in={advancedOpen || hasChips} unmountOnExit>
                    <Box
                        data-testid="search-chips"
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.75,
                            minHeight: chipsRowReservedHeight,
                            pt: `${chipsRowTopGap}px`,
                        }}
                    >
                        {chips}
                    </Box>
                </Collapse>
                <Collapse
                    data-testid="search-advanced-panel"
                    id={advancedPanelId}
                    in={advancedOpen}
                >
                    <Box
                        sx={{
                            borderTop: "1px solid",
                            borderColor: "surfaces.hairlineFaint",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 3,
                            mt: 1.75,
                            pt: 1.75,
                        }}
                    >
                        {mediaType && (
                            <Box
                                data-testid="workspace-media-refinement"
                                sx={{
                                    ...advancedSectionSx,
                                    width: mediaSectionWidth,
                                }}
                            >
                                <Typography
                                    component="h2"
                                    variant="refineSectionLabel"
                                >
                                    Media
                                </Typography>
                                {mediaType === "TV" && (
                                    <Stack
                                        data-testid="season-episode-pair"
                                        direction="row"
                                        spacing={1.25}
                                    >
                                        <SeasonEpisodeInput
                                            fieldRef={seasonFieldRef}
                                            label="Season"
                                            registration={register("season", {
                                                pattern: /^\d*$/,
                                            })}
                                        />
                                        <SeasonEpisodeInput
                                            fieldRef={episodeFieldRef}
                                            label="Episode"
                                            registration={register("episode")}
                                        />
                                    </Stack>
                                )}
                                <TextField
                                    disabled={!selected}
                                    fullWidth
                                    id="additional-query"
                                    label="Additional filter terms"
                                    slotProps={{
                                        htmlInput: {
                                            "data-testid": "additional-query",
                                        },
                                    }}
                                    inputRef={setAdditionalQueryInputRef}
                                    // Matches the Age & Size section's own
                                    // `rowGap: 1.5` (its own comment: "wider
                                    // so the size row's notched labels clear
                                    // the age fields above"): the TV
                                    // Season/Episode row above this field has
                                    // the identical clearance need, but
                                    // `advancedSectionSx`'s `gap: 0.75` is
                                    // shared with the heading-to-first-row
                                    // gap, so the extra 0.75 is added here
                                    // rather than raised for the whole
                                    // section.
                                    sx={{mt: mediaType === "TV" ? 0.75 : 0}}
                                    {...additionalQueryRegistration}
                                />
                            </Box>
                        )}
                        <Box
                            data-testid="workspace-ranges"
                            sx={advancedSectionSx}
                        >
                            <Typography
                                component="h2"
                                variant="refineSectionLabel"
                            >
                                Age &amp; size
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    // The 6px column gutter is load-bearing
                                    // (`rangeSectionWidth` sums it); the row
                                    // gap is wider so the size row's notched
                                    // labels clear the age fields above.
                                    columnGap: 0.75,
                                    rowGap: 1.5,
                                    maxWidth: rangeSectionWidth,
                                }}
                            >
                                <AdvancedRangeInput
                                    fieldRef={minageFieldRef}
                                    invalid={Boolean(errors.minage)}
                                    label="Min age"
                                    registration={register("minage", {
                                        pattern: /^\d*$/,
                                    })}
                                    unit="d"
                                />
                                <AdvancedRangeInput
                                    invalid={Boolean(errors.maxage)}
                                    label="Max age"
                                    registration={register("maxage", {
                                        pattern: /^\d*$/,
                                    })}
                                    unit="d"
                                />
                                <AdvancedRangeInput
                                    fieldRef={minsizeFieldRef}
                                    invalid={Boolean(errors.minsize)}
                                    label="Min size"
                                    registration={register("minsize", {
                                        pattern: /^\d*$/,
                                    })}
                                    unit="MB"
                                />
                                <AdvancedRangeInput
                                    invalid={Boolean(errors.maxsize)}
                                    label="Max size"
                                    registration={register("maxsize", {
                                        pattern: /^\d*$/,
                                    })}
                                    unit="MB"
                                />
                            </Box>
                        </Box>
                        {showIndexerSelection &&
                            eligibleIndexers.length > 0 && (
                                <Box
                                    aria-label="Indexer selection"
                                    data-testid="workspace-indexers"
                                    sx={{
                                        ...advancedSectionSx,
                                        flex: "1 1 100%",
                                    }}
                                >
                                    <Typography
                                        component="h2"
                                        variant="refineSectionLabel"
                                    >
                                        Indexers
                                    </Typography>
                                    <Box ref={indexersFieldsRef}>
                                        {!indexerSelectionAsCheckboxes && (
                                            <TextField
                                                label="Indexers"
                                                select
                                                SelectProps={{
                                                    multiple: true,
                                                    value: selectedIndexers,
                                                    onChange: (event) =>
                                                        selectIndexers(
                                                            typeof event.target
                                                                .value ===
                                                                "string"
                                                                ? event.target.value.split(
                                                                      ",",
                                                                  )
                                                                : (event.target
                                                                      .value as string[]),
                                                        ),
                                                }}
                                                fullWidth
                                            >
                                                {eligibleIndexers.map(
                                                    (indexer) => (
                                                        <MenuItem
                                                            key={indexer.name}
                                                            value={indexer.name}
                                                        >
                                                            {indexer.name}
                                                        </MenuItem>
                                                    ),
                                                )}
                                            </TextField>
                                        )}
                                        {indexerSelectionAsCheckboxes && (
                                            // A real installation has 20-25
                                            // indexers: laid out column-major
                                            // (CSS multi-column) they read
                                            // top-to-bottom in the catalog's own
                                            // order within each column, instead of
                                            // wrapping row-major across the panel.
                                            <Box
                                                sx={{
                                                    columnGap: "16px",
                                                    columnWidth: 160,
                                                }}
                                            >
                                                {eligibleIndexers.map(
                                                    (indexer) => (
                                                        <FormControlLabel
                                                            key={indexer.name}
                                                            control={
                                                                <Checkbox
                                                                    checked={selectedIndexers.includes(
                                                                        indexer.name,
                                                                    )}
                                                                    onChange={() =>
                                                                        selectIndexers(
                                                                            selectedIndexers.includes(
                                                                                indexer.name,
                                                                            )
                                                                                ? selectedIndexers.filter(
                                                                                      (
                                                                                          name,
                                                                                      ) =>
                                                                                          name !==
                                                                                          indexer.name,
                                                                                  )
                                                                                : [
                                                                                      ...selectedIndexers,
                                                                                      indexer.name,
                                                                                  ],
                                                                        )
                                                                    }
                                                                    size="small"
                                                                />
                                                            }
                                                            label={indexer.name}
                                                            sx={{
                                                                breakInside:
                                                                    "avoid",
                                                                display: "flex",
                                                                m: 0,
                                                            }}
                                                        />
                                                    ),
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                    <Box>
                                        <IndexerSelectionButton
                                            eligibleIndexers={eligibleIndexers}
                                            onReset={() => resetIndexers()}
                                            onSelect={selectIndexers}
                                            selectedIndexers={selectedIndexers}
                                        />
                                    </Box>
                                </Box>
                            )}
                    </Box>
                </Collapse>
            </Box>
            <Stack spacing={2} sx={{p: 2}}>
                {noIndexers && (
                    <Alert severity="info">
                        {eligibleIndexers.length === 0
                            ? "No indexers are configured or enabled. Configure an indexer before searching."
                            : "You didn't select any indexers."}
                    </Alert>
                )}
                {autocompleteState === "malformed" && (
                    <Alert severity="warning">
                        Title suggestions were unavailable because the response
                        was invalid.
                    </Alert>
                )}
                {autocompleteState === "error" && (
                    <Alert severity="warning">
                        Title suggestions are currently unavailable.
                    </Alert>
                )}
                <Box
                    data-testid="workspace-actions"
                    sx={{
                        display: "flex",
                        flexDirection: {xs: "column", sm: "row"},
                        justifyContent: "space-between",
                        alignItems: {sm: "center"},
                        gap: 2,
                    }}
                >
                    {historyTool}
                </Box>
            </Stack>
        </Paper>
    );
}
