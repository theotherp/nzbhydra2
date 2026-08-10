import {useQuery} from "@tanstack/react-query";
import {
    Alert,
    Card,
    CardContent,
    CircularProgress,
    Stack,
    Typography,
} from "@mui/material";

import {getNews, MalformedNewsResponseError} from "../../../api/news";
import type {NewsEntry} from "../../../api/news";
import {ApiTransport} from "../../../api/transport";
import {SafeRichContent} from "../../../components/content/SafeRichContent";

type NewsPageProps = {
    loadNews?: () => Promise<NewsEntry[]>;
    transport?: ApiTransport;
};

export function NewsPage({loadNews, transport}: NewsPageProps) {
    if (!loadNews && !transport) {
        throw new Error("NewsPage requires a news loader or API transport");
    }

    const newsQuery = useQuery({
        queryKey: ["news"],
        queryFn: loadNews ?? (() => getNews(transport as ApiTransport)),
    });

    if (newsQuery.isPending) {
        return <NewsLoading />;
    }

    if (newsQuery.isError) {
        return <NewsError error={newsQuery.error} />;
    }

    if (newsQuery.data.length === 0) {
        return (
            <Typography component="h2" textAlign="center" variant="h5">
                No news yet ;-)
            </Typography>
        );
    }

    return (
        <Stack spacing={2}>
            {newsQuery.data.map((entry, index) => (
                <Card key={`${entry.version}-${index}`}>
                    <CardContent>
                        <Typography component="h2" variant="h6">
                            {entry.version}{" "}
                            {entry.forCurrentVersion && "(This version)"}
                            {entry.forNewerVersion && "(Newer version)"}
                        </Typography>
                        <SafeRichContent html={entry.news} />
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}

function NewsLoading() {
    return (
        <Stack alignItems="center" role="status" spacing={2}>
            <CircularProgress variant="indeterminate" />
            <Typography>Loading…</Typography>
        </Stack>
    );
}

function NewsError({error}: {error: Error}) {
    const message =
        error instanceof MalformedNewsResponseError
            ? "News data could not be displayed."
            : "Unable to load news.";

    return <Alert severity="error">{message}</Alert>;
}
