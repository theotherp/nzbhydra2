import {Alert, CircularProgress, Stack, Typography} from "@mui/material";
import {useNavigate, useSearch} from "@tanstack/react-router";
import {useState} from "react";

import {executeSearch} from "../../api/search";
import type {SearchRequest, SearchResponse} from "../../api/search";
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
}: {
    bootstrap: BootstrapData;
    transport?: ApiTransport;
}) {
    const transport = suppliedTransport ?? new ApiTransport(bootstrap.baseUrl);
    const navigate = useNavigate({from: "/"});
    const search = useSearch({strict: false});
    const catalog = createCategoryCatalog(bootstrap.safeConfig);
    const initialValues = valuesFromSearch(search, catalog);
    const [state, setState] = useState<{
        data?: SearchResponse;
        error?: Error;
        loading: boolean;
    }>({loading: false});
    const submit = async (values: SearchFormValues) => {
        const indexers = catalog.preselectedIndexerNames(values.category);
        if (indexers.length === 0) {
            return;
        }
        await navigate({to: "/", search: canonicalSearch(values)});
        setState({loading: true});
        const request: SearchRequest = {
            query: values.query || undefined,
            category: values.category,
            minage: numberOrUndefined(values.minage),
            maxage: numberOrUndefined(values.maxage),
            minsize: numberOrUndefined(values.minsize),
            maxsize: numberOrUndefined(values.maxsize),
            indexers,
            loadAll: false,
            searchRequestId: numericRequestId(),
        };
        try {
            setState({
                loading: false,
                data: await executeSearch(transport, request),
            });
        } catch (error) {
            setState({
                loading: false,
                error:
                    error instanceof Error ? error : new Error("Search failed"),
            });
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
            />
            {state.loading && (
                <Stack alignItems="center" role="status">
                    <CircularProgress />
                    <Typography>Loading…</Typography>
                </Stack>
            )}
            {state.error && (
                <Alert severity="error">Unable to execute search.</Alert>
            )}
            {state.data && <SearchResults data={state.data} />}
        </Stack>
    );
}

function numberOrUndefined(value: string): number | undefined {
    return value === "" ? undefined : Number(value);
}
function numericRequestId(): number {
    return Math.floor(Math.random() * 1000000000);
}
