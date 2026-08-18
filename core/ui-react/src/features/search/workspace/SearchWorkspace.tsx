import {
    Alert,
    Box,
    Button,
    ButtonGroup,
    Checkbox,
    Divider,
    FormControlLabel,
    InputBase,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Menu,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DnsIcon from "@mui/icons-material/Dns";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import RemoveDoneIcon from "@mui/icons-material/RemoveDone";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SearchIcon from "@mui/icons-material/Search";
import ShareIcon from "@mui/icons-material/Share";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import type {ReactNode} from "react";
import type {UseFormRegisterReturn} from "react-hook-form";
import {Controller, useForm} from "react-hook-form";
import {useEffect, useId, useRef, useState} from "react";
import {z} from "zod";

import {monoFontFamily} from "../../../app/theme";
import type {MediaSuggestion} from "../../../api/media";
import type {
    CategoryCatalog,
    SearchIndexer,
} from "../../../domain/categories/catalog";

const numericString = z.string().regex(/^\d*$/);
const defaultAutocomplete = async (): Promise<MediaSuggestion[]> => [];

// Surface values of the mock's search-bar row and its Advanced disclosure,
// read from the `<div style="...background:#232a2c...">` row in
// `uimock/NZBHydra Search.dc.html`.
//
// They stay local to this component instead of moving into `theme.ts`
// (FM-043's file, out of scope for FM-044): the mock uses them for this one
// row only, and no second consumer exists. Everything the theme already
// carries -- the brand teal `primary.main`, IBM Plex Sans/Mono, the button
// radius, `textTransform: "none"` -- is consumed from the theme rather than
// restated here.
const rowBackground = "#232a2c";
const controlSurface = "#2a3133";
const recessedSurface = "#1c2224";
const controlBorderColor = "rgba(255, 255, 255, 0.1)";
const rowBorderColor = "rgba(255, 255, 255, 0.07)";
const advancedBorderColor = "rgba(255, 255, 255, 0.06)";
const pairDividerColor = "rgba(255, 255, 255, 0.12)";
const pairLabelColor = "#8a9291";
const mutedGlyphColor = "#6b7472";
// The row's own control radius; larger than the theme's shared 8px, which the
// mock keeps for the buttons inside the row.
const controlRadius = "11px";
const controlGap = "10px";

const rowControlSurfaceSx = {
    backgroundColor: controlSurface,
    border: `1px solid ${controlBorderColor}`,
    borderRadius: controlRadius,
} as const;

// The mock draws its numeric inputs bare, without the browser's number
// spinners, which do not fit a 40-74px field.
const withoutNumberSpinners = {
    "& input": {MozAppearance: "textfield"},
    "& input::-webkit-inner-spin-button, & input::-webkit-outer-spin-button": {
        WebkitAppearance: "none",
        margin: 0,
    },
} as const;

const pairedInputSx = {
    ...withoutNumberSpinners,
    fontFamily: monoFontFamily,
    fontSize: "13.5px",
    width: 40,
    "& input": {
        ...withoutNumberSpinners["& input"],
        p: "12px 0",
        textAlign: "center",
    },
} as const;

const advancedInputSx = {
    ...withoutNumberSpinners,
    backgroundColor: recessedSurface,
    border: `1px solid ${controlBorderColor}`,
    borderRadius: "8px",
    fontFamily: monoFontFamily,
    fontSize: "13px",
    width: 74,
    "& input": {...withoutNumberSpinners["& input"], p: "7px 9px"},
    "&.Mui-error": {borderColor: "error.main"},
} as const;

const queryInputSx = {
    color: "text.primary",
    flex: 1,
    fontSize: "15px",
    "& input": {p: "12px 6px"},
    "& input::placeholder": {color: mutedGlyphColor, opacity: 1},
} as const;

// The mock's select carries no visible caption, but the control keeps its
// existing accessible name: the `Category` `InputLabel` is only clipped, so
// the `combobox`'s `aria-labelledby` name computation is unchanged.
const clippedLabelSx = {
    border: 0,
    clip: "rect(0 0 0 0)",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    whiteSpace: "nowrap",
    width: "1px",
} as const;

export const searchFormSchema = z.object({
    query: z.string(),
    category: z.string().min(1),
    minage: numericString,
    maxage: numericString,
    minsize: numericString,
    maxsize: numericString,
    title: z.string(),
    additionalQuery: z.string(),
    season: numericString,
    episode: z.string(),
    imdbId: z.string(),
    tmdbId: z.string(),
    tvdbId: z.string(),
    tvmazeId: z.string(),
    tvrageId: z.string(),
    indexers: z.array(z.string()),
});

export type SearchFormValues = z.infer<typeof searchFormSchema>;

export function valuesFromSearch(
    search: Record<string, unknown>,
    catalog: CategoryCatalog,
): SearchFormValues {
    const category =
        typeof search.category === "string" &&
        catalog.categories.some((entry) => entry.name === search.category)
            ? search.category
            : catalog.defaultCategory.name;
    const field = (name: string) =>
        typeof search[name] === "string" && /^\d*$/.test(search[name])
            ? search[name]
            : "";
    const preset =
        catalog.enableCategorySizes && category === catalog.defaultCategory.name
            ? catalog.defaultCategory
            : catalog.categories.find((entry) => entry.name === category);
    return {
        query: typeof search.query === "string" ? search.query : "",
        category,
        minage: field("minage"),
        maxage: field("maxage"),
        minsize: field("minsize") || (preset?.minSizePreset?.toString() ?? ""),
        maxsize: field("maxsize") || (preset?.maxSizePreset?.toString() ?? ""),
        title:
            typeof search.title === "string"
                ? search.title
                : typeof search.query === "string"
                  ? search.query
                  : "",
        additionalQuery:
            typeof search.query === "string" && typeof search.title === "string"
                ? search.query
                : "",
        season: field("season"),
        episode: typeof search.episode === "string" ? search.episode : "",
        imdbId: fieldValue(search, "imdbId"),
        tmdbId: fieldValue(search, "tmdbId"),
        tvdbId: fieldValue(search, "tvdbId"),
        tvmazeId: fieldValue(search, "tvmazeId"),
        tvrageId: fieldValue(search, "tvrageId"),
        indexers: indexersFromSearch(search, catalog, category),
    };
}

function indexersFromSearch(
    search: Record<string, unknown>,
    catalog: CategoryCatalog,
    category: string,
): string[] {
    const eligible = new Set(
        catalog.eligibleIndexers(category).map((indexer) => indexer.name),
    );
    if (typeof search.indexers !== "string") {
        return catalog.preselectedIndexerNames(category);
    }
    return search.indexers.split(",").filter((name) => eligible.has(name));
}

function fieldValue(search: Record<string, unknown>, name: string): string {
    return typeof search[name] === "string" ? search[name] : "";
}

export function canonicalSearch(
    values: SearchFormValues,
): Record<string, string> {
    return Object.fromEntries(
        Object.entries({
            query: hasIdentifier(values)
                ? values.additionalQuery
                : values.title || values.query,
            category: values.category,
            minage: values.minage,
            maxage: values.maxage,
            minsize: values.minsize,
            maxsize: values.maxsize,
            title: hasIdentifier(values) ? values.title : "",
            season: values.season,
            episode: values.episode,
            imdbId: values.imdbId,
            tmdbId: values.tmdbId,
            tvdbId: values.tvdbId,
            tvmazeId: values.tvmazeId,
            tvrageId: values.tvrageId,
            indexers: values.indexers.join(","),
        }).filter(([, value]) => value !== ""),
    );
}

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
    const [suggestions, setSuggestions] = useState<MediaSuggestion[]>([]);
    const [autocompleteState, setAutocompleteState] = useState<
        "idle" | "loading" | "empty" | "error" | "malformed"
    >("idle");
    const [activeOption, setActiveOption] = useState(-1);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const request = useRef(0);
    const listboxId = useId();
    const advancedPanelId = useId();
    const mediaType = mediaTypeForCategory(
        catalog.categories.find(
            (category) => category.name === selectedCategory,
        )?.searchType,
    );
    const selected = hasIdentifier(watch());
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
                    setAutocompleteState(next.length === 0 ? "empty" : "idle");
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
    const clearSelection = () => {
        request.current++;
        for (const key of identifierFields) {
            setValue(key, "");
        }
    };
    const chooseSuggestion = (suggestion: MediaSuggestion) => {
        request.current++;
        setValue("title", suggestion.title);
        for (const key of identifierFields) {
            setValue(key, suggestion[key] ?? "");
        }
        setSuggestions([]);
        setActiveOption(-1);
        document.getElementById("additional-query")?.focus();
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
    const queryInput = mediaType ? (
        <InputBase
            fullWidth
            inputProps={{
                "aria-activedescendant":
                    activeOption >= 0
                        ? `${listboxId}-${activeOption}`
                        : undefined,
                "aria-controls": suggestions.length ? listboxId : undefined,
                "aria-label": "Search",
                "data-testid": "search-query",
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
            sx={queryInputSx}
            type="search"
            {...register("title", {
                onChange: () => {
                    request.current++;
                    if (selected) {
                        clearSelection();
                    }
                },
            })}
        />
    ) : (
        <InputBase
            fullWidth
            inputProps={{
                "aria-label": "Search",
                "data-testid": "search-query",
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onSearchDrop}
            placeholder="Search…"
            sx={queryInputSx}
            type="search"
            {...register("query")}
        />
    );
    return (
        <Paper
            component="form"
            data-testid="search-workspace"
            elevation={1}
            onSubmit={handleSubmit(onSubmit)}
            sx={{mt: 3}}
        >
            <Box
                data-testid="workspace-primary"
                sx={{
                    backgroundColor: rowBackground,
                    borderBottom: `1px solid ${rowBorderColor}`,
                    borderRadius: "12px 12px 0 0",
                    px: "18px",
                    py: "14px",
                }}
            >
                <Box
                    sx={{
                        alignItems: "stretch",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: controlGap,
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
                                size="small"
                                slotProps={{
                                    inputLabel: {sx: clippedLabelSx},
                                    select: {"aria-label": "Category"},
                                }}
                                sx={{
                                    flexGrow: {xs: 1, sm: 0},
                                    flexShrink: 0,
                                    minWidth: 150,
                                    "& .MuiInputBase-root": {
                                        ...rowControlSurfaceSx,
                                        fontSize: "13.5px",
                                        height: "100%",
                                    },
                                    "& .MuiOutlinedInput-notchedOutline": {
                                        border: "none",
                                    },
                                    "& .MuiSelect-select": {
                                        alignItems: "center",
                                        display: "flex",
                                        minHeight: 0,
                                        py: 0,
                                    },
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
                    {mediaType === "TV" && (
                        <Box
                            data-testid="season-episode-pair"
                            sx={{
                                ...rowControlSurfaceSx,
                                alignItems: "center",
                                display: "flex",
                                flexShrink: 0,
                                gap: "6px",
                                px: "12px",
                            }}
                        >
                            <Typography
                                component="span"
                                sx={{
                                    color: pairLabelColor,
                                    fontSize: "11.5px",
                                }}
                            >
                                S
                            </Typography>
                            <InputBase
                                inputProps={{"aria-label": "Season"}}
                                placeholder="—"
                                sx={pairedInputSx}
                                type="number"
                                {...register("season", {pattern: /^\d*$/})}
                            />
                            <Box
                                component="span"
                                sx={{
                                    backgroundColor: pairDividerColor,
                                    height: 16,
                                    width: "1px",
                                }}
                            />
                            <Typography
                                component="span"
                                sx={{
                                    color: pairLabelColor,
                                    fontSize: "11.5px",
                                }}
                            >
                                E
                            </Typography>
                            <InputBase
                                inputProps={{"aria-label": "Episode"}}
                                placeholder="—"
                                sx={pairedInputSx}
                                {...register("episode")}
                            />
                        </Box>
                    )}
                    <Box
                        sx={{
                            alignItems: "center",
                            backgroundColor: recessedSurface,
                            border: `1px solid ${controlBorderColor}`,
                            borderRadius: controlRadius,
                            display: "flex",
                            flex: 1,
                            minWidth: 260,
                            pl: "14px",
                            position: "relative",
                            pr: "4px",
                        }}
                    >
                        <SearchIcon
                            sx={{
                                color: mutedGlyphColor,
                                fontSize: 18,
                                mr: "8px",
                            }}
                        />
                        {queryInput}
                        <Button
                            data-testid="search-submit"
                            sx={{
                                alignSelf: "center",
                                flexShrink: 0,
                                fontSize: "14px",
                                fontWeight: 600,
                                mr: "2px",
                                px: "20px",
                                py: "10px",
                            }}
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
                                    backgroundColor: controlSurface,
                                    backgroundImage: "none",
                                    border: `1px solid ${pairDividerColor}`,
                                    borderRadius: controlRadius,
                                    left: 0,
                                    listStyle: "none",
                                    m: 0,
                                    overflow: "hidden",
                                    p: "6px",
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
                                            borderRadius: "7px",
                                            cursor: "pointer",
                                            fontSize: "13.5px",
                                            px: "10px",
                                            py: "9px",
                                            bgcolor:
                                                activeOption === index
                                                    ? "action.selected"
                                                    : undefined,
                                        }}
                                    >
                                        {suggestion.title}
                                        {suggestion.year
                                            ? ` (${suggestion.year})`
                                            : ""}
                                    </Box>
                                ))}
                            </Paper>
                        )}
                    </Box>
                    <Button
                        aria-controls={advancedPanelId}
                        aria-expanded={advancedOpen}
                        data-testid="search-advanced-toggle"
                        endIcon={
                            advancedOpen ? (
                                <ExpandLessIcon />
                            ) : (
                                <ExpandMoreIcon />
                            )
                        }
                        onClick={() => setAdvancedOpen((open) => !open)}
                        sx={{
                            ...rowControlSurfaceSx,
                            color: advancedOpen
                                ? "primary.main"
                                : "text.primary",
                            flexGrow: {xs: 1, sm: 0},
                            flexShrink: 0,
                            fontSize: "13px",
                            fontWeight: 500,
                            px: "16px",
                            "& .MuiButton-endIcon": {
                                color: mutedGlyphColor,
                                ml: "7px",
                                "& > *": {fontSize: 16},
                            },
                        }}
                    >
                        Advanced
                    </Button>
                </Box>
                <Box
                    data-testid="search-advanced-panel"
                    id={advancedPanelId}
                    sx={{
                        borderTop: `1px solid ${advancedBorderColor}`,
                        display: advancedOpen ? "block" : "none",
                        mt: "14px",
                        pt: "14px",
                    }}
                >
                    <Box
                        data-testid="workspace-ranges"
                        sx={{display: "flex", flexWrap: "wrap", gap: "22px"}}
                    >
                        <AdvancedRangeGroup title="Age (days)">
                            <AdvancedRangeInput
                                invalid={Boolean(errors.minage)}
                                label="Minimum age (days)"
                                placeholder="min"
                                registration={register("minage", {
                                    pattern: /^\d*$/,
                                })}
                            />
                            <AdvancedRangeInput
                                invalid={Boolean(errors.maxage)}
                                label="Maximum age (days)"
                                placeholder="max"
                                registration={register("maxage", {
                                    pattern: /^\d*$/,
                                })}
                            />
                        </AdvancedRangeGroup>
                        <AdvancedRangeGroup title="Size (MB)">
                            <AdvancedRangeInput
                                invalid={Boolean(errors.minsize)}
                                label="Minimum size (MB)"
                                placeholder="min"
                                registration={register("minsize", {
                                    pattern: /^\d*$/,
                                })}
                            />
                            <AdvancedRangeInput
                                invalid={Boolean(errors.maxsize)}
                                label="Maximum size (MB)"
                                placeholder="max"
                                registration={register("maxsize", {
                                    pattern: /^\d*$/,
                                })}
                            />
                        </AdvancedRangeGroup>
                    </Box>
                </Box>
            </Box>
            <Stack spacing={2} sx={{p: {xs: 2, sm: "18px"}}}>
                {noIndexers && (
                    <Alert severity="info">
                        {eligibleIndexers.length === 0
                            ? "No indexers are configured or enabled. Configure an indexer before searching."
                            : "You didn't select any indexers."}
                    </Alert>
                )}
                {autocompleteState === "loading" && (
                    <Alert role="status" severity="info">
                        Loading title suggestions…
                    </Alert>
                )}
                {autocompleteState === "empty" && (
                    <Alert role="status" severity="info">
                        No title suggestions found.
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
                {mediaType && (
                    <Box data-testid="workspace-media-refinement">
                        <TextField
                            disabled={!selected}
                            fullWidth
                            id="additional-query"
                            label="Additional filter terms"
                            size="small"
                            slotProps={{
                                htmlInput: {"data-testid": "additional-query"},
                            }}
                            {...register("additionalQuery")}
                        />
                    </Box>
                )}
                {showIndexerSelection && eligibleIndexers.length > 0 && (
                    <Box
                        aria-label="Indexer selection"
                        data-testid="workspace-indexers"
                    >
                        {!indexerSelectionAsCheckboxes && (
                            <TextField
                                label="Indexers"
                                select
                                size="small"
                                SelectProps={{
                                    multiple: true,
                                    value: selectedIndexers,
                                    onChange: (event) =>
                                        selectIndexers(
                                            typeof event.target.value ===
                                                "string"
                                                ? event.target.value.split(",")
                                                : (event.target
                                                      .value as string[]),
                                        ),
                                }}
                                fullWidth
                                sx={{
                                    "& .MuiInputBase-root": {
                                        backgroundColor: controlSurface,
                                        borderRadius: controlRadius,
                                        fontSize: "13.5px",
                                    },
                                    "& .MuiOutlinedInput-notchedOutline": {
                                        borderColor: controlBorderColor,
                                    },
                                }}
                            >
                                {eligibleIndexers.map((indexer) => (
                                    <MenuItem
                                        key={indexer.name}
                                        value={indexer.name}
                                    >
                                        {indexer.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                        {indexerSelectionAsCheckboxes && (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "4px 16px",
                                }}
                            >
                                {eligibleIndexers.map((indexer) => (
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
                                                                  (name) =>
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
                                            m: 0,
                                            "& .MuiFormControlLabel-label": {
                                                fontSize: "13px",
                                            },
                                        }}
                                    />
                                ))}
                            </Box>
                        )}
                        <Box sx={{mt: 1}}>
                            <IndexerSelectionButton
                                eligibleIndexers={eligibleIndexers}
                                onReset={() => resetIndexers()}
                                onSelect={selectIndexers}
                                selectedIndexers={selectedIndexers}
                            />
                        </Box>
                    </Box>
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

// The mock's Advanced disclosure labels each range with one uppercase caption
// above a pair of bare min/max inputs, instead of the two full-width labeled
// fields this form used before. Each input keeps its exact previous accessible
// name as an `aria-label`, because a 74px field cannot carry a floating
// "Minimum age (days)" caption without overflowing it.
function AdvancedRangeGroup({
    children,
    title,
}: {
    children: ReactNode;
    title: string;
}) {
    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: "6px"}}>
            <Typography
                component="h2"
                sx={{
                    color: mutedGlyphColor,
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                }}
            >
                {title}
            </Typography>
            <Box sx={{display: "flex", gap: "6px"}}>{children}</Box>
        </Box>
    );
}

function AdvancedRangeInput({
    invalid,
    label,
    placeholder,
    registration,
}: {
    invalid: boolean;
    label: string;
    placeholder: string;
    registration: UseFormRegisterReturn;
}) {
    return (
        <InputBase
            error={invalid}
            inputProps={{"aria-label": label}}
            placeholder={placeholder}
            sx={advancedInputSx}
            type="number"
            {...registration}
        />
    );
}

const identifierFields = [
    "imdbId",
    "tmdbId",
    "tvdbId",
    "tvmazeId",
    "tvrageId",
] as const;

function hasIdentifier(values: SearchFormValues): boolean {
    return identifierFields.some((field) => values[field] !== "");
}

// A split button mirroring the legacy UI's actual search-page indexer
// selection control: a default "Invert selection" action plus a dropdown
// for the other bulk actions, with named-group actions broken into a
// labeled "Indexer groups" subsection.
//
// Legacy source: `core/ui-src/js/search-controller.js`'s
// `buildIndexerSelectionActions`/`buildGroupSelectionActions`, rendered by
// `core/ui-src/html/states/search.html`'s own split button (default action
// + `additionalIndexerSelectionActions` dropdown) and by
// `multiselect-dropdown.html`'s `actions` loop. `core/ui-src/js/directives/
// indexer-selection-button.js` (a same-named but unrelated, unused-on-any-
// legacy-page directive — confirmed absent from every legacy HTML
// template) is NOT this control's legacy source, despite the similar name.
//
// Action order matches legacy exactly: invert (always visible), then
// reset/select-all/deselect-all/usenet/torznab in the dropdown. The
// "Indexer groups" subsection is legacy parity too, not a novel addition:
// `buildGroupSelectionActions` emits one action per group labeled
// `group: 'Indexer groups'`, and both legacy renderers show a divider and
// an "Indexer groups" header before the first such action — exactly what
// the `Divider`/`ListSubheader` below do.
//
// Icon basis: every legacy action already carries a Bootstrap glyphicon
// (invert=retweet, reset=repeat, select-all=ok, deselect-all=remove,
// usenet=hdd, torznab=magnet, group=folder-open); MUI icons substitute a
// semantically equivalent icon per action from a different icon library,
// which is a routine ADR-0002 toolkit substitution, not a content
// variance. The group action's icon is `FolderOpenIcon`, matching
// legacy's `glyphicon-folder-open` directly.
//
// FM-044 restyles this control's surfaces to the mock's search-row design
// language (ADR-0009's own named example of extending that language to an
// element the mock does not show). The action set, order, icons, and
// `aria-haspopup`/`aria-expanded`/`role="menu"`/`role="menuitem"` semantics
// above are unchanged by that restyle.
function IndexerSelectionButton({
    eligibleIndexers,
    selectedIndexers,
    onSelect,
    onReset,
}: {
    eligibleIndexers: SearchIndexer[];
    selectedIndexers: string[];
    onSelect(names: string[]): void;
    onReset(): void;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);
    const close = () => setAnchorEl(null);
    const choose = (names: string[]) => {
        onSelect(names);
        close();
    };
    const usenetIndexers = eligibleIndexers
        .filter((indexer) => indexer.searchModuleType !== "TORZNAB")
        .map((indexer) => indexer.name);
    const torznabIndexers = eligibleIndexers
        .filter((indexer) => indexer.searchModuleType === "TORZNAB")
        .map((indexer) => indexer.name);
    const groups = [
        ...new Set(eligibleIndexers.flatMap((indexer) => indexer.groupNames)),
    ].sort();
    return (
        <>
            <ButtonGroup
                size="small"
                sx={{
                    "& .MuiButton-root": {
                        backgroundColor: controlSurface,
                        borderColor: controlBorderColor,
                        color: "text.primary",
                        fontSize: "13px",
                        "&:hover": {
                            backgroundColor: controlSurface,
                            borderColor: "primary.main",
                            color: "primary.main",
                        },
                    },
                }}
                variant="outlined"
            >
                <Button
                    onClick={() =>
                        onSelect(
                            eligibleIndexers
                                .filter(
                                    (indexer) =>
                                        !selectedIndexers.includes(
                                            indexer.name,
                                        ),
                                )
                                .map((indexer) => indexer.name),
                        )
                    }
                    startIcon={<SwapHorizIcon />}
                >
                    Invert selection
                </Button>
                <Button
                    aria-expanded={open ? "true" : undefined}
                    aria-haspopup="menu"
                    aria-label="More selection options"
                    onClick={(event) => setAnchorEl(event.currentTarget)}
                    sx={{px: 0.5}}
                >
                    <ArrowDropDownIcon />
                </Button>
            </ButtonGroup>
            <Menu
                anchorEl={anchorEl}
                onClose={close}
                open={open}
                slotProps={{
                    list: {
                        sx: {
                            "& .MuiMenuItem-root": {
                                borderRadius: "7px",
                                fontSize: "13px",
                                mx: "6px",
                                "&:hover": {color: "primary.main"},
                                "&:hover .MuiListItemIcon-root": {
                                    color: "inherit",
                                },
                            },
                        },
                    },
                    paper: {
                        sx: {
                            backgroundColor: controlSurface,
                            backgroundImage: "none",
                            border: `1px solid ${controlBorderColor}`,
                            borderRadius: controlRadius,
                        },
                    },
                }}
            >
                <MenuItem
                    onClick={() => {
                        onReset();
                        close();
                    }}
                >
                    <ListItemIcon>
                        <RestartAltIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Reset to preselection</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() =>
                        choose(eligibleIndexers.map((indexer) => indexer.name))
                    }
                >
                    <ListItemIcon>
                        <DoneAllIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Select all</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => choose([])}>
                    <ListItemIcon>
                        <RemoveDoneIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Deselect all</ListItemText>
                </MenuItem>
                {usenetIndexers.length > 0 && (
                    <MenuItem onClick={() => choose(usenetIndexers)}>
                        <ListItemIcon>
                            <DnsIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Select all usenet indexers</ListItemText>
                    </MenuItem>
                )}
                {torznabIndexers.length > 0 && (
                    <MenuItem onClick={() => choose(torznabIndexers)}>
                        <ListItemIcon>
                            <ShareIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Select all torznab indexers</ListItemText>
                    </MenuItem>
                )}
                {groups.length > 0 && [
                    <Divider key="indexer-groups-divider" />,
                    <ListSubheader
                        key="indexer-groups-header"
                        sx={{backgroundColor: "transparent"}}
                    >
                        Indexer groups
                    </ListSubheader>,
                    ...groups.map((group) => (
                        <MenuItem
                            key={group}
                            onClick={() =>
                                choose(
                                    eligibleIndexers
                                        .filter((indexer) =>
                                            indexer.groupNames.includes(group),
                                        )
                                        .map((indexer) => indexer.name),
                                )
                            }
                        >
                            <ListItemIcon>
                                <FolderOpenIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Select group {group}</ListItemText>
                        </MenuItem>
                    )),
                ]}
            </Menu>
        </>
    );
}

function mediaTypeForCategory(
    searchType: "BOOK" | "MOVIE" | "MUSIC" | "SEARCH" | "TVSEARCH" | undefined,
): "MOVIE" | "TV" | undefined {
    if (searchType === "MOVIE") {
        return "MOVIE";
    }
    if (searchType === "TVSEARCH") {
        return "TV";
    }
    return undefined;
}
