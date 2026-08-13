import {
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Stack,
    Typography,
} from "@mui/material";
import {useNavigate, useSearch} from "@tanstack/react-router";
import {useEffect, useRef, useState} from "react";

import {executeSearch, shortcutSearch} from "../../api/search";
import type {SearchRequest, SearchResponse} from "../../api/search";
import {getAutocomplete, getEmbyAvailability} from "../../api/media";
import {createSearchLiveTransport} from "../../api/live/searchState";
import type {
    SearchLiveTransport,
    SearchProgress,
} from "../../api/live/searchState";
import {SockJsStompLiveTransport} from "../../api/live/transport";
import type {LiveSubscription} from "../../api/live/transport";
import {ApiTransport} from "../../api/transport";
import {createCategoryCatalog} from "../../domain/categories/catalog";
import type {BootstrapData} from "../../bootstrap";
import {SearchResults} from "./results/SearchResults";
import {
    canonicalSearch,
    SearchWorkspace,
    valuesFromSearch,
} from "./workspace/SearchWorkspace";
import type {SearchFormValues} from "./workspace/SearchWorkspace";

export function SearchPage({
    bootstrap,
    transport: suppliedTransport,
    liveTransport: suppliedLiveTransport,
}: {
    bootstrap: BootstrapData;
    transport?: ApiTransport;
    liveTransport?: SearchLiveTransport;
}) {
    const transport = suppliedTransport ?? new ApiTransport(bootstrap.baseUrl);
    const liveTransport =
        suppliedLiveTransport ??
        createSearchLiveTransport(
            new SockJsStompLiveTransport(bootstrap.baseUrl),
        );
    const navigate = useNavigate({from: "/"});
    const search = useSearch({strict: false});
    const catalog = createCategoryCatalog(bootstrap.safeConfig);
    const initialValues = valuesFromSearch(search, catalog);
    const requestedEpisode =
        typeof search.episode === "string" ? search.episode : undefined;
    const episodeRequested = requestedEpisode !== undefined;
    const [state, setState] = useState<{
        data?: SearchResponse;
        error?: Error;
        loading: boolean;
    }>({loading: false});
    const [progress, setProgress] = useState<SearchProgress>();
    const [liveUnavailable, setLiveUnavailable] = useState<string>();
    const [embyAvailability, setEmbyAvailability] = useState<
        "available" | "unavailable" | "error" | undefined
    >();
    const activeSubmission = useRef<
        {cancelled: boolean; subscription?: LiveSubscription} | undefined
    >(undefined);
    const embyGeneration = useRef(0);
    const releaseSubmission = (submission = activeSubmission.current) => {
        if (!submission || submission.cancelled) {
            return;
        }
        submission.cancelled = true;
        if (activeSubmission.current === submission) {
            activeSubmission.current = undefined;
        }
        submission.subscription?.close();
        submission.subscription = undefined;
    };
    useEffect(
        () => () => {
            embyGeneration.current++;
            releaseSubmission();
        },
        [],
    );
    const submit = async (values: SearchFormValues) => {
        const selectedCategory = catalog.categories.find(
            (category) => category.name === values.category,
        );
        const isTvSearch = selectedCategory?.searchType === "TVSEARCH";
        const indexers = values.indexers;
        if (indexers.length === 0) {
            return;
        }
        releaseSubmission();
        const submission: {
            cancelled: boolean;
            subscription?: LiveSubscription;
        } = {
            cancelled: false,
        };
        activeSubmission.current = submission;
        const currentEmbyGeneration = ++embyGeneration.current;
        setEmbyAvailability(undefined);
        await navigate({
            to: "/",
            search: {
                ...canonicalSearch(values),
                ...(episodeRequested && !values.episode
                    ? {episode: requestedEpisode}
                    : {}),
            },
        });
        if (submission.cancelled) {
            return;
        }
        setProgress(undefined);
        setLiveUnavailable(undefined);
        setState({loading: true});
        const request: SearchRequest = {
            query:
                values.additionalQuery ||
                (hasMediaIdentifiers(values)
                    ? undefined
                    : values.title || values.query || undefined),
            category: values.category,
            minage: numberOrUndefined(values.minage),
            maxage: numberOrUndefined(values.maxage),
            minsize: numberOrUndefined(values.minsize),
            maxsize: numberOrUndefined(values.maxsize),
            indexers,
            loadAll: false,
            searchRequestId: numericRequestId(),
            ...(hasMediaIdentifiers(values)
                ? {
                      title: values.title,
                      imdbId: values.imdbId || undefined,
                      tmdbId: values.tmdbId || undefined,
                      tvdbId: values.tvdbId || undefined,
                      tvmazeId: values.tvmazeId || undefined,
                      tvrageId: values.tvrageId || undefined,
                      season: numberOrUndefined(values.season),
                      episode: values.episode || undefined,
                  }
                : isTvSearch
                  ? {
                        season: numberOrUndefined(values.season),
                        episode: values.episode || undefined,
                    }
                  : {}),
        };
        try {
            const subscribed = await liveTransport.subscribeSearchState(
                request.searchRequestId,
                (nextProgress) => {
                    if (activeSubmission.current === submission) {
                        setProgress(nextProgress);
                    }
                },
                (error) => {
                    if (activeSubmission.current === submission) {
                        setLiveUnavailable(error.message);
                    }
                },
            );
            if (submission.cancelled) {
                subscribed.close();
                return;
            }
            submission.subscription = subscribed;
        } catch (error) {
            if (activeSubmission.current === submission) {
                setLiveUnavailable(
                    error instanceof Error
                        ? error.message
                        : "Live progress is unavailable",
                );
            }
        }
        try {
            const data = await executeSearch(transport, request);
            if (activeSubmission.current === submission) {
                setState({loading: false, data});
                if (isEmbyConfigured(bootstrap.safeConfig)) {
                    void checkEmbyAvailability(
                        transport,
                        values,
                        selectedCategory?.searchType,
                        (availability) => {
                            if (
                                embyGeneration.current === currentEmbyGeneration
                            ) {
                                setEmbyAvailability(availability);
                            }
                        },
                    );
                }
            }
        } catch (error) {
            if (activeSubmission.current === submission) {
                setState({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error
                            : new Error("Search failed"),
                });
            }
        } finally {
            releaseSubmission(submission);
        }
    };
    const showEarlyResults = async () => {
        if (!progress) {
            return;
        }
        try {
            await shortcutSearch(transport, progress.searchRequestId);
        } catch {
            setLiveUnavailable("Unable to show early results.");
        }
    };
    return (
        <Stack component="main" spacing={2}>
            <Typography component="h1" variant="h4">
                Search
            </Typography>
            <SearchWorkspace
                catalog={catalog}
                initialValues={initialValues}
                onSubmit={submit}
                autocomplete={(type, input) =>
                    getAutocomplete(transport, type, input)
                }
                showIndexerSelection={bootstrap.showIndexerSelection === true}
                indexerSelectionAsCheckboxes={isCheckboxIndexerSelection(
                    bootstrap.safeConfig,
                )}
            />
            {embyAvailability === "available" && (
                <Alert severity="success">Available in Emby.</Alert>
            )}
            {embyAvailability === "unavailable" && (
                <Alert severity="info">Not available in Emby.</Alert>
            )}
            {embyAvailability === "error" && (
                <Alert severity="warning">
                    Unable to check Emby availability.
                </Alert>
            )}
            {state.loading && (
                <Stack alignItems="center" role="status">
                    <CircularProgress />
                    <Typography>Loading…</Typography>
                </Stack>
            )}
            {state.error && (
                <Alert severity="error">Unable to execute search.</Alert>
            )}
            {liveUnavailable && !state.loading && (
                <Alert severity="warning">{liveUnavailable}</Alert>
            )}
            {state.data && (
                <SearchResults
                    data={state.data}
                    episodeRequested={episodeRequested}
                />
            )}
            <Dialog
                data-testid="search-status-modal"
                open={state.loading}
                aria-describedby="search-progress-status"
                onClose={() => undefined}
            >
                <DialogTitle>Searching… please wait</DialogTitle>
                <DialogContent>
                    {liveUnavailable && (
                        <Alert severity="warning" sx={{mb: 1}}>
                            {liveUnavailable}
                        </Alert>
                    )}
                    <Stack
                        id="search-progress-status"
                        spacing={1}
                        role="status"
                    >
                        <Typography>
                            {progress
                                ? `Indexers finished: ${progress.indexersFinished} / ${progress.indexersSelected}`
                                : "Preparing live search progress…"}
                        </Typography>
                        {progress?.indexerSelectionFinished ? (
                            <LinearProgress
                                value={
                                    progress.indexersSelected === 0
                                        ? 0
                                        : (progress.indexersFinished /
                                              progress.indexersSelected) *
                                          100
                                }
                                variant="determinate"
                            />
                        ) : (
                            <CircularProgress size={24} />
                        )}
                        {progress?.messages.map((message) => (
                            <Typography key={message} variant="body2">
                                {message}
                            </Typography>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={!progress?.hasResults}
                        onClick={() => void showEarlyResults()}
                    >
                        Show early results
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}

function numberOrUndefined(value: string): number | undefined {
    return value === "" ? undefined : Number(value);
}

function numericRequestId(): number {
    return Math.floor(Math.random() * 1000000000);
}

function hasMediaIdentifiers(values: SearchFormValues): boolean {
    return Boolean(
        values.imdbId ||
        values.tmdbId ||
        values.tvdbId ||
        values.tvmazeId ||
        values.tvrageId,
    );
}

async function checkEmbyAvailability(
    transport: ApiTransport,
    values: SearchFormValues,
    searchType: "BOOK" | "MOVIE" | "MUSIC" | "SEARCH" | "TVSEARCH" | undefined,
    setAvailability: (value: "available" | "unavailable" | "error") => void,
): Promise<void> {
    const type =
        searchType === "MOVIE"
            ? "MOVIE"
            : searchType === "TVSEARCH"
              ? "TV"
              : undefined;
    const id =
        type === "MOVIE"
            ? values.tmdbId
            : type === "TV"
              ? values.tvdbId
              : undefined;
    if (!type || !id) {
        return;
    }
    try {
        setAvailability(
            (await getEmbyAvailability(transport, type, id))
                ? "available"
                : "unavailable",
        );
    } catch {
        setAvailability("error");
    }
}

function isEmbyConfigured(safeConfig: unknown): boolean {
    if (!safeConfig || typeof safeConfig !== "object") {
        return false;
    }
    const emby = (safeConfig as {emby?: unknown}).emby;
    if (!emby || typeof emby !== "object") {
        return false;
    }
    const {embyBaseUrl, embyApiKey} = emby as {
        embyBaseUrl?: unknown;
        embyApiKey?: unknown;
    };
    return typeof embyBaseUrl === "string" && typeof embyApiKey === "string";
}

function isCheckboxIndexerSelection(safeConfig: unknown): boolean {
    return Boolean(
        safeConfig &&
        typeof safeConfig === "object" &&
        (safeConfig as {indexerSelectionAsCheckboxes?: unknown})
            .indexerSelectionAsCheckboxes === true,
    );
}
