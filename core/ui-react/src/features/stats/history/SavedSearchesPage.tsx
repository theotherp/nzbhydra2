import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Link,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useNavigate} from "@tanstack/react-router";
import {useState} from "react";

import {
    deleteSavedSearch,
    getSavedSearches,
    redirectRidUrl,
    type SavedSearch,
} from "../../../api/savedSearches";
import {ApiTransport} from "../../../api/transport";
import {externalLink} from "../../../domain/links/externalLinks";
import {createCategoryCatalog} from "../../../domain/categories/catalog";
import {useSafeConfig, type BootstrapData} from "../../../bootstrap";
import {savedSearchCriteria} from "../../search/history/savedSearchCriteria";
import {Loading} from "../shared/Loading";

const queryKey = ["saved-searches"];

export function SavedSearchesPage({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const navigate = useNavigate({from: "/stats/saved-searches"});
    const queryClient = useQueryClient();
    const safeConfig = useSafeConfig(bootstrap);
    const catalog = createCategoryCatalog(safeConfig);
    const [pendingDelete, setPendingDelete] = useState<number>();
    const query = useQuery({
        queryKey,
        queryFn: () => getSavedSearches(transport),
    });
    const deletion = useMutation({
        mutationFn: (index: number) => deleteSavedSearch(transport, index),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey});
            setPendingDelete(undefined);
        },
    });
    if (query.isPending) {
        return <Loading message="Loading saved searches…" />;
    }
    if (query.isError) {
        return <Alert severity="error">Unable to load saved searches.</Alert>;
    }
    const {searches, malformedCount} = query.data;
    return (
        <Stack component="main" spacing={2}>
            <Typography component="h1" variant="h4">
                Saved searches
            </Typography>
            {malformedCount > 0 && (
                <Alert severity="warning">
                    {malformedCount} malformed saved search entries were not
                    displayed.
                </Alert>
            )}
            {searches.length === 0 ? (
                <Alert severity="info">
                    You can save searches after making a search. Saved searches
                    will show up here.
                </Alert>
            ) : (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Query</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Additional parameters</TableCell>
                            <TableCell>Search</TableCell>
                            <TableCell>Delete</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {searches.map(({search, serverIndex}) => (
                            <TableRow key={savedKey(search, serverIndex)}>
                                <TableCell>{queryLabel(search)}</TableCell>
                                <TableCell>{search.categoryName}</TableCell>
                                <TableCell>
                                    <Criteria
                                        search={search}
                                        transport={transport}
                                        dereferer={safeConfig?.dereferer}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        onClick={() =>
                                            void navigate({
                                                to: "/",
                                                search: savedSearchCriteria(
                                                    search,
                                                    catalog,
                                                ),
                                            })
                                        }
                                    >
                                        Search
                                    </Button>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        color="error"
                                        disabled={deletion.isPending}
                                        onClick={() =>
                                            setPendingDelete(serverIndex)
                                        }
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
            <Dialog
                open={pendingDelete !== undefined}
                onClose={() =>
                    !deletion.isPending && setPendingDelete(undefined)
                }
            >
                <DialogTitle>Delete saved search?</DialogTitle>
                <DialogContent>
                    <Typography>This saved search will be removed.</Typography>
                    {deletion.isError && (
                        <Alert severity="error">
                            Unable to delete saved search.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={deletion.isPending}
                        onClick={() => setPendingDelete(undefined)}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        disabled={deletion.isPending}
                        onClick={() =>
                            pendingDelete !== undefined &&
                            deletion.mutate(pendingDelete)
                        }
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}

function Criteria({
    search,
    transport,
    dereferer,
}: {
    search: SavedSearch;
    transport: ApiTransport;
    dereferer: unknown;
}) {
    const values: React.ReactNode[] = [];
    for (const identifier of search.identifiers) {
        const link = identifierLink(
            identifier.identifierKey,
            identifier.identifierValue,
            transport,
            dereferer,
        );
        values.push(
            link ? (
                <Link
                    href={link}
                    key={`${identifier.identifierKey}-${identifier.identifierValue}`}
                    rel="noreferrer"
                    target="_blank"
                >
                    {identifierLabel(identifier.identifierKey)}:{" "}
                    {identifier.identifierValue}
                </Link>
            ) : (
                `${identifierLabel(identifier.identifierKey)}: ${identifier.identifierValue}`
            ),
        );
    }
    if (search.season !== undefined) values.push(`Season: ${search.season}`);
    if (search.episode) values.push(`Episode: ${search.episode}`);
    if (search.author) values.push(`Author: ${search.author}`);
    const age = range(search.minAge, search.maxAge, " day", " old");
    const size = range(search.minSize, search.maxSize, "MB", "");
    if (age) values.push(age);
    if (size) values.push(size);
    return (
        <Stack component="span" direction="row" flexWrap="wrap" gap={1}>
            {values.map((value, index) => (
                <span key={index}>
                    {value}
                    {index < values.length - 1 ? "," : ""}
                </span>
            ))}
        </Stack>
    );
}

function identifierLink(
    key: string,
    value: string,
    transport: ApiTransport,
    dereferer: unknown,
): string | undefined {
    if (key === "TVRAGE") return redirectRidUrl(transport, value);
    const external =
        key === "TMDB"
            ? `https://www.themoviedb.org/movie/${value}`
            : key === "IMDB"
              ? `https://www.imdb.com/title/tt${value.replace(/^tt/, "")}`
              : key === "TVDB"
                ? `https://thetvdb.com/?tab=series&id=${value}`
                : key === "TVMAZE"
                  ? `https://www.tvmaze.com/shows/${value}`
                  : undefined;
    return external ? externalLink(external, dereferer) : undefined;
}

function identifierLabel(key: string): string {
    return key === "TVRAGE" ? "TVRage ID" : `${key} ID`;
}
function queryLabel(search: SavedSearch): string {
    return (
        search.title ??
        search.query ??
        (search.identifiers.length === 0 &&
        search.season === undefined &&
        !search.episode
            ? "Update query"
            : "")
    );
}
function savedKey(search: SavedSearch, index: number): string {
    return `${search.categoryName}-${search.query ?? search.title ?? ""}-${index}`;
}
function range(
    min: number | undefined,
    max: number | undefined,
    unit: string,
    suffix: string,
): string | undefined {
    if (min !== undefined && max !== undefined)
        return `${min}-${max}${unit}s${suffix}`;
    if (min !== undefined)
        return `Min ${min}${unit}${min === 1 ? "" : "s"}${suffix}`;
    return max !== undefined
        ? `Max ${max}${unit}${max === 1 ? "" : "s"}${suffix}`
        : undefined;
}
