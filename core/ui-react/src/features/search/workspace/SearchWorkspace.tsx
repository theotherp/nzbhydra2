import {Alert, Box, Button, MenuItem, Stack, TextField} from "@mui/material";
import {Controller, useForm} from "react-hook-form";
import {useEffect, useId, useRef, useState} from "react";
import {z} from "zod";

import type {MediaSuggestion} from "../../../api/media";
import type {CategoryCatalog} from "../../../domain/categories/catalog";

const numericString = z.string().regex(/^\d*$/);
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
    };
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
        }).filter(([, value]) => value !== ""),
    );
}

export function SearchWorkspace({
    catalog,
    initialValues,
    onSubmit,
    autocomplete = async () => [],
}: {
    catalog: CategoryCatalog;
    initialValues: SearchFormValues;
    onSubmit(values: SearchFormValues): void;
    autocomplete?(
        type: "MOVIE" | "TV",
        input: string,
    ): Promise<MediaSuggestion[]>;
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
    const request = useRef(0);
    const listboxId = useId();
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
    const noIndexers =
        catalog.preselectedIndexerNames(selectedCategory).length === 0;
    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{mt: 3}}>
            <Stack spacing={2}>
                {noIndexers && (
                    <Alert severity="info">
                        No indexers are configured or enabled. Configure an
                        indexer before searching.
                    </Alert>
                )}
                {mediaType ? (
                    <>
                        <TextField
                            label="Search"
                            slotProps={{
                                htmlInput: {
                                    "data-testid": "search-query",
                                    "aria-controls": suggestions.length
                                        ? listboxId
                                        : undefined,
                                    "aria-activedescendant":
                                        activeOption >= 0
                                            ? `${listboxId}-${activeOption}`
                                            : undefined,
                                },
                            }}
                            type="search"
                            {...register("title", {
                                onChange: () => {
                                    request.current++;
                                    if (selected) {
                                        clearSelection();
                                    }
                                },
                            })}
                            onKeyDown={(event) => {
                                if (
                                    event.key === "ArrowDown" &&
                                    suggestions.length
                                ) {
                                    event.preventDefault();
                                    setActiveOption((current) =>
                                        Math.min(
                                            current + 1,
                                            suggestions.length - 1,
                                        ),
                                    );
                                } else if (
                                    event.key === "ArrowUp" &&
                                    suggestions.length
                                ) {
                                    event.preventDefault();
                                    setActiveOption((current) =>
                                        Math.max(current - 1, 0),
                                    );
                                } else if (
                                    event.key === "Enter" &&
                                    activeOption >= 0
                                ) {
                                    event.preventDefault();
                                    chooseSuggestion(suggestions[activeOption]);
                                } else if (event.key === "Escape") {
                                    setSuggestions([]);
                                }
                            }}
                        />
                        {suggestions.length > 0 && (
                            <Box
                                component="ul"
                                data-testid="autocomplete-popup"
                                id={listboxId}
                                role="listbox"
                                sx={{m: 0, p: 0, listStyle: "none"}}
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
                                            cursor: "pointer",
                                            p: 1,
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
                            </Box>
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
                                Title suggestions were unavailable because the
                                response was invalid.
                            </Alert>
                        )}
                        {autocompleteState === "error" && (
                            <Alert severity="warning">
                                Title suggestions are currently unavailable.
                            </Alert>
                        )}
                        <TextField
                            id="additional-query"
                            label="Additional filter terms"
                            slotProps={{
                                htmlInput: {"data-testid": "additional-query"},
                            }}
                            disabled={!selected}
                            {...register("additionalQuery")}
                        />
                        {mediaType === "TV" && (
                            <Stack direction={{sm: "row"}} spacing={2}>
                                <TextField
                                    label="Season"
                                    type="number"
                                    {...register("season", {pattern: /^\d*$/})}
                                />
                                <TextField
                                    label="Episode"
                                    {...register("episode")}
                                />
                            </Stack>
                        )}
                    </>
                ) : (
                    <TextField
                        label="Search"
                        slotProps={{htmlInput: {"data-testid": "search-query"}}}
                        type="search"
                        {...register("query")}
                    />
                )}
                <Controller
                    control={control}
                    name="category"
                    render={({field}) => (
                        <TextField
                            data-testid="search-category-control"
                            label="Category"
                            select
                            {...field}
                            onChange={(event) =>
                                categoryChanged(event.target.value)
                            }
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
                <Stack direction={{sm: "row"}} spacing={2}>
                    <TextField
                        label="Minimum age (days)"
                        type="number"
                        {...register("minage", {pattern: /^\d*$/})}
                        error={Boolean(errors.minage)}
                    />
                    <TextField
                        label="Maximum age (days)"
                        type="number"
                        {...register("maxage", {pattern: /^\d*$/})}
                        error={Boolean(errors.maxage)}
                    />
                    <TextField
                        label="Minimum size (MB)"
                        type="number"
                        {...register("minsize", {pattern: /^\d*$/})}
                        error={Boolean(errors.minsize)}
                    />
                    <TextField
                        label="Maximum size (MB)"
                        type="number"
                        {...register("maxsize", {pattern: /^\d*$/})}
                        error={Boolean(errors.maxsize)}
                    />
                </Stack>
                <Button
                    data-testid="search-submit"
                    disabled={noIndexers}
                    type="submit"
                    variant="contained"
                >
                    Search
                </Button>
            </Stack>
        </Box>
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
