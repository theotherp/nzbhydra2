import {
    Alert,
    Box,
    Button,
    ButtonGroup,
    Checkbox,
    Divider,
    FormControlLabel,
    InputAdornment,
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

import type {MediaSuggestion} from "../../../api/media";
import type {
    CategoryCatalog,
    SearchIndexer,
} from "../../../domain/categories/catalog";

const numericString = z.string().regex(/^\d*$/);
const defaultAutocomplete = async (): Promise<MediaSuggestion[]> => [];

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

// The single source of truth for which form field's text a non-identifier
// search submits: the visible `search-query` input registers to `title` for
// a media category and to `query` otherwise (`mediaTypeForCategoryName`,
// mirrored from the render's own resolution at `mediaType` below), never a
// `title || query` fallback. Both `canonicalSearch` (the URL writer) and
// `SearchPage.submit()` (the request builder) call this one function so the
// address bar and the executed request can never disagree about which
// field's text was actually submitted -- see FM-051.
export function nonIdentifierQueryText(
    values: SearchFormValues,
    catalog: CategoryCatalog,
): string {
    return mediaTypeForCategoryName(catalog, values.category)
        ? values.title
        : values.query;
}

export function canonicalSearch(
    values: SearchFormValues,
    catalog: CategoryCatalog,
): Record<string, string> {
    return Object.fromEntries(
        Object.entries({
            query: hasIdentifier(values)
                ? values.additionalQuery
                : nonIdentifierQueryText(values, catalog),
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
    const searchQueryFieldRef = useRef<HTMLInputElement | null>(null);
    const autocompleteContainerRef = useRef<HTMLDivElement | null>(null);
    const isFirstCategoryRender = useRef(true);
    const listboxId = useId();
    const advancedPanelId = useId();
    const mediaType = mediaTypeForCategoryName(catalog, selectedCategory);
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
                input: {startAdornment: searchAdornment},
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
                    backgroundColor: "surfaces.bar",
                    borderBottom: "1px solid",
                    borderColor: "surfaces.hairlineFaint",
                    // Stands in for the Paper's own `overflow: hidden` this
                    // bar used to rely on to keep its square corners from
                    // poking past the form's rounded ones (`MuiPaper`'s
                    // `theme.ts` override, 12px for a raised, non-square
                    // Paper). That clip also cut off the autocomplete
                    // dropdown below at the form's bottom edge -- an
                    // absolutely-positioned descendant is clipped by any
                    // `overflow: hidden` ancestor, not just its immediate
                    // parent -- so the Paper is unclipped and only this bar,
                    // the one child that actually needs it, carries its own
                    // matching top corners instead.
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
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
                    {mediaType === "TV" && (
                        <Stack
                            data-testid="season-episode-pair"
                            direction="row"
                            spacing={1.25}
                            sx={{flexShrink: 0}}
                        >
                            <SeasonEpisodeInput
                                label="Season"
                                registration={register("season", {
                                    pattern: /^\d*$/,
                                })}
                            />
                            <SeasonEpisodeInput
                                label="Episode"
                                registration={register("episode")}
                            />
                        </Stack>
                    )}
                    <Button
                        aria-controls={advancedPanelId}
                        aria-expanded={advancedOpen}
                        color={advancedOpen ? "primary" : "inherit"}
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
                            bgcolor: "surfaces.control",
                            borderColor: "surfaces.hairline",
                            flexGrow: {xs: 1, sm: 0},
                            flexShrink: 0,
                        }}
                        variant="outlined"
                    >
                        Advanced
                    </Button>
                </Box>
                <Box
                    data-testid="search-advanced-panel"
                    id={advancedPanelId}
                    sx={{
                        borderTop: "1px solid",
                        borderColor: "surfaces.hairlineFaint",
                        display: advancedOpen ? "block" : "none",
                        mt: 1.75,
                        pt: 1.75,
                    }}
                >
                    <Box
                        data-testid="workspace-ranges"
                        sx={{display: "flex", flexWrap: "wrap", gap: 3}}
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
            <Stack spacing={2} sx={{p: 2}}>
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
                                        sx={{m: 0}}
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

function SeasonEpisodeInput({
    label,
    registration,
}: {
    label: string;
    registration: UseFormRegisterReturn;
}) {
    const {ref, ...rest} = registration;
    return (
        <TextField
            label={label}
            slotProps={{htmlInput: {inputMode: "numeric"}}}
            sx={{width: 90}}
            inputRef={ref}
            {...rest}
        />
    );
}

function AdvancedRangeGroup({
    children,
    title,
}: {
    children: ReactNode;
    title: string;
}) {
    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 0.75}}>
            <Typography
                color="text.secondary"
                component="h2"
                variant="overline"
            >
                {title}
            </Typography>
            <Box sx={{display: "flex", gap: 0.75}}>{children}</Box>
        </Box>
    );
}

// A 100px min/max field cannot carry its full name as a floating label
// without overflowing, so each input keeps its exact previous accessible
// name as an `aria-label` (an allowed exception under the ADR-0014
// conventions for genuinely label-free compact controls).
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
    const {ref, ...rest} = registration;
    return (
        <TextField
            error={invalid}
            placeholder={placeholder}
            slotProps={{
                htmlInput: {"aria-label": label, inputMode: "numeric"},
            }}
            sx={{width: 100}}
            inputRef={ref}
            {...rest}
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

export function hasIdentifier(values: SearchFormValues): boolean {
    return identifierFields.some((field) => values[field] !== "");
}

// A split button mirroring the legacy UI's actual search-page indexer
// selection control: a default "Invert selection" action plus a dropdown
// for the other bulk actions, with named-group actions broken into a
// labeled "Indexer groups" subsection.
//
// Legacy source: `core/ui-src/js/search-controller.js`'s
// `buildIndexerSelectionActions`/`buildGroupSelectionActions`, rendered by
// `core/ui-src/html/states/search.html`'s own split button. Action order
// matches legacy exactly: invert (always visible), then
// reset/select-all/deselect-all/usenet/torznab in the dropdown, then one
// action per indexer group under an "Indexer groups" subheader, exactly as
// legacy's `group: 'Indexer groups'` actions render. Icons substitute a
// semantically equivalent MUI icon per legacy glyphicon (ADR-0002).
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
                color="inherit"
                size="small"
                sx={{
                    "& .MuiButton-root": {
                        bgcolor: "surfaces.control",
                        borderColor: "surfaces.hairline",
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
            <Menu anchorEl={anchorEl} onClose={close} open={open}>
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

function mediaTypeForCategoryName(
    catalog: CategoryCatalog,
    categoryName: string,
): "MOVIE" | "TV" | undefined {
    return mediaTypeForCategory(
        catalog.categories.find((category) => category.name === categoryName)
            ?.searchType,
    );
}
