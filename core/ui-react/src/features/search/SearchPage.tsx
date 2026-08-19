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
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useNavigate, useSearch} from "@tanstack/react-router";
import {useContext, useEffect, useRef, useState} from "react";
import type {
    SearchLiveTransport,
    SearchProgress,
} from "../../api/live/searchState";
import {createSearchLiveTransport} from "../../api/live/searchState";
import type {LiveSubscription} from "../../api/live/transport";
import {SockJsStompLiveTransport} from "../../api/live/transport";
import {getAutocomplete, getEmbyAvailability} from "../../api/media";
import type {RecentSearch} from "../../api/recentSearches";
import {createSavedSearch} from "../../api/savedSearches";

import type {SearchRequest, SearchResponse} from "../../api/search";
import {
    continuationRequest,
    executeSearch,
    mergeSearchResponses,
    shortcutSearch,
} from "../../api/search";
import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {ToastContext} from "../../components/toasts/toasts";
import type {CategoryCatalog} from "../../domain/categories/catalog";
import {createCategoryCatalog} from "../../domain/categories/catalog";
import {recentSearchCriteria} from "./history/recentSearchCriteria";
import {RecentSearches} from "./history/RecentSearches";
import {SearchResults} from "./results/SearchResults";
import type {SearchFormValues} from "./workspace/SearchWorkspace";
import {
    canonicalSearch,
    hasIdentifier,
    nonIdentifierQueryText,
    SearchWorkspace,
    valuesFromSearch,
} from "./workspace/SearchWorkspace";

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
    const toasts = useContext(ToastContext);
    const [recentSearchQueryClient] = useState(() => new QueryClient());
    const liveTransport =
        suppliedLiveTransport ??
        createSearchLiveTransport(
            new SockJsStompLiveTransport(bootstrap.baseUrl),
        );
    const navigate = useNavigate({from: "/"});
    const search = useSearch({strict: false});
    const catalog = createCategoryCatalog(bootstrap.safeConfig);
    const [refillCriteria, setRefillCriteria] =
        useState<Record<string, string>>();
    const [draggedRecentSearch, setDraggedRecentSearch] =
        useState<RecentSearch>();
    const [recentRefreshKey, setRecentRefreshKey] = useState(0);
    const initialValues = valuesFromSearch(refillCriteria ?? search, catalog);
    const requestedEpisode =
        typeof search.episode === "string" ? search.episode : undefined;
    const episodeRequested = requestedEpisode !== undefined;
    const [state, setState] = useState<{
        data?: SearchResponse;
        error?: Error;
        request?: SearchRequest;
        loading: boolean;
    }>({loading: false});
    const [progress, setProgress] = useState<SearchProgress>();
    const [liveUnavailable, setLiveUnavailable] = useState<string>();
    const [embyAvailability, setEmbyAvailability] = useState<
        "available" | "unavailable" | "error" | undefined
    >();
    const [savingSearch, setSavingSearch] = useState(false);
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
    // Deferred by a macrotask, and cancelled on (re)mount, so React 19
    // StrictMode's dev-only mount -> unmount -> remount double-invoke of
    // this effect doesn't cancel a same-pass in-flight auto-submission
    // (triggered by AutoSubmitFromRoute's own mount effect, e.g. loading a
    // URL that already encodes an executed search) before its `navigate()`
    // call even resolves. A genuine unmount has no following remount to
    // clear this, so the deferred release still runs.
    const pendingUnmountRelease = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    useEffect(() => {
        if (pendingUnmountRelease.current !== null) {
            clearTimeout(pendingUnmountRelease.current);
            pendingUnmountRelease.current = null;
        }
        return () => {
            pendingUnmountRelease.current = setTimeout(() => {
                pendingUnmountRelease.current = null;
                embyGeneration.current++;
                releaseSubmission();
            });
        };
    }, []);
    const submit = async (values: SearchFormValues) => {
        setRefillCriteria(undefined);
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
                ...canonicalSearch(values, catalog),
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
                (hasIdentifier(values)
                    ? undefined
                    : nonIdentifierQueryText(values, catalog) || undefined),
            category: values.category,
            minage: numberOrUndefined(values.minage),
            maxage: numberOrUndefined(values.maxage),
            minsize: numberOrUndefined(values.minsize),
            maxsize: numberOrUndefined(values.maxsize),
            indexers,
            loadAll: false,
            searchRequestId: numericRequestId(),
            ...(hasIdentifier(values)
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
                setState({loading: false, data, request});
                setRecentRefreshKey((key) => key + 1);
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
    const refill = (recentSearch: RecentSearch) => {
        setRefillCriteria(recentSearchCriteria(recentSearch, catalog));
    };
    const repeat = (recentSearch: RecentSearch) => {
        void submit(
            valuesFromSearch(
                recentSearchCriteria(recentSearch, catalog),
                catalog,
            ),
        );
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
    const loadMore = async (loadAll: boolean) => {
        if (!state.data || !state.request) {
            throw new Error("Search continuation is unavailable.");
        }
        const {data, request} = state;
        if (
            data.pagingState !== "ready" ||
            data.offset === undefined ||
            data.limit === undefined
        ) {
            throw new Error(
                "The server returned incomplete paging information.",
            );
        }
        const offset = data.offset + data.limit;
        const remaining =
            data.numberOfProcessedResults === undefined
                ? undefined
                : Math.max(
                      0,
                      data.numberOfAvailableResults -
                          data.numberOfProcessedResults,
                  );
        const next = await executeSearch(
            transport,
            continuationRequest(
                request,
                offset,
                loadAll ? remaining : undefined,
                loadAll,
            ),
        );
        const terminalLoadAllResponse =
            loadAll && next.offset === 0 && next.limit === 0;
        if (
            !terminalLoadAllResponse &&
            (next.offset === undefined ||
                next.limit === undefined ||
                next.offset + next.limit <= offset)
        ) {
            throw new Error(
                "The server did not advance the search cache position.",
            );
        }
        setState((current) =>
            current.data === data && current.request === request
                ? {
                      loading: false,
                      request,
                      data: mergeSearchResponses(data, next),
                  }
                : current,
        );
    };
    const saveSearch = async () => {
        if (!state.request || savingSearch) {
            return;
        }
        setSavingSearch(true);
        try {
            await createSavedSearch(transport, state.request);
            toasts?.showToast({
                severity: "success",
                message: "Search saved.",
            });
        } catch {
            toasts?.showToast({
                severity: "error",
                message: "Unable to save search.",
            });
        } finally {
            setSavingSearch(false);
        }
    };
    const recentSearchTool = (
        <QueryClientProvider client={recentSearchQueryClient}>
            <RecentSearches
                enabled={!state.loading}
                onDragStart={setDraggedRecentSearch}
                onRefill={refill}
                onRepeat={repeat}
                refreshKey={recentRefreshKey}
                transport={transport}
            />
        </QueryClientProvider>
    );
    return (
        <Stack
            component="main"
            spacing={2}
            sx={{px: {xs: 1, sm: 2}, width: "100%"}}
        >
            <Typography
                component="h1"
                variant="h4"
                sx={{
                    border: 0,
                    clip: "rect(0 0 0 0)",
                    // The visually-hidden box must be literal 1px strings:
                    // numeric width/height 0..1 are percentages in MUI sx,
                    // so `width: 1` rendered a full-width absolute box that
                    // overflowed the page horizontally.
                    height: "1px",
                    margin: "-1px",
                    overflow: "hidden",
                    padding: 0,
                    position: "absolute",
                    whiteSpace: "nowrap",
                    width: "1px",
                }}
            >
                Search
            </Typography>
            <SearchWorkspace
                key={JSON.stringify(initialValues)}
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
                onSearchDrop={() => {
                    if (draggedRecentSearch) {
                        refill(draggedRecentSearch);
                        setDraggedRecentSearch(undefined);
                    }
                }}
                historyTool={recentSearchTool}
            />
            <AutoSubmitFromRoute
                catalog={catalog}
                criteria={hasExecutableCriteria(search) ? search : undefined}
                onSubmit={submit}
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
            {state.data && state.request && (
                <SearchResults
                    data={state.data}
                    episodeRequested={episodeRequested}
                    onLoadMore={loadMore}
                    onSaveSearch={saveSearch}
                    savingSearch={savingSearch}
                    searchRequestId={state.request.searchRequestId}
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

// Runs the search encoded in the URL's query string — whether the page was
// opened fresh (typed/bookmarked/shared link), navigated to from search
// history, saved searches, or the search's own canonical URL after a manual
// submit. `submittedCriteria` dedupes on the *resolved* form values, not the
// raw route object, so it fires once per distinct search: a manual submit's
// own `navigate()` call reproduces a canonical URL that resolves to the same
// values, which this effect then recognizes as already-submitted instead of
// searching a second time. Resolved-value dedup (rather than raw-object
// dedup) also covers the Search History repeat path correctly: a history
// entry with no recorded `selectedIndexers` omits `indexers` from the route
// object entirely, so `valuesFromSearch` only resolves it to the default
// preselection when this effect runs — raw-object dedup would then see the
// pre-submit URL (no `indexers`, `repeat: "history"`) and the post-submit
// canonical URL (`indexers` set, no `repeat`) as two distinct criteria and
// search twice.
function AutoSubmitFromRoute({
    catalog,
    criteria,
    onSubmit,
}: {
    catalog: CategoryCatalog;
    criteria: Record<string, unknown> | undefined;
    onSubmit(values: SearchFormValues): Promise<void>;
}) {
    const submittedCriteria = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (!criteria) {
            return;
        }
        const values = valuesFromSearch(criteria, catalog);
        const serialized = JSON.stringify(values);
        if (submittedCriteria.current === serialized) {
            return;
        }
        submittedCriteria.current = serialized;
        void onSubmit(values);
    }, [catalog, criteria, onSubmit]);
    return null;
}

// A `search` route object represents a real, executable search — not just a
// prefill hint — in either of two cases: it carries `indexers`
// (`canonicalSearch` always writes this once indexers are selected, which
// only happens by actually submitting the form; the "submit" button is
// disabled otherwise), or it carries the Search History repeat marker
// (`repeat: "history"`, written only by `SearchHistoryPage`'s "Repeat"
// action). The marker is still needed alongside the `indexers` check because
// `recentSearchCriteria` omits `indexers` entirely when the history entry
// has no recorded `selectedIndexers` — a real, ADR-0005-designed case for
// pre-existing rows and for searches that never explicitly restricted
// indexers (evidenced by `SearchEntity.selectedIndexers` being nullable with
// no `@NotNull`, `Searcher.java` only setting it when the request explicitly
// restricts indexers, and ADR-0005's accepted contract requiring repeat to
// remain usable with default indexers for entries that lack it). Without the
// marker, such a repeat would silently downgrade to a non-executing prefill
// instead of auto-running as it did before this trigger existed. Route
// search states that carry neither signal — e.g. a bare category default,
// or fields a test/page sets to prefill without submitting — are left
// alone, so a partial prefill URL doesn't fire a premature, incomplete
// request.
function hasExecutableCriteria(search: Record<string, unknown>): boolean {
    return (
        (typeof search.indexers === "string" && search.indexers !== "") ||
        search.repeat === "history"
    );
}

function numberOrUndefined(value: string): number | undefined {
    return value === "" ? undefined : Number(value);
}

function numericRequestId(): number {
    return Math.floor(Math.random() * 1000000000);
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
