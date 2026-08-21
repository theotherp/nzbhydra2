import {Card, CardContent, Stack, Typography} from "@mui/material";

import type {StatsResult} from "../../../../api/stats/mainStats";
import {
    averageResponseTimeAcrossIndexers,
    overallDownloadSuccessRate,
    totalDownloads,
    totalSearches,
} from "../derivations";

type Tile = {key: string; label: string; value: string; testId: string};

/**
 * Presentation Structure item 2: each tile renders only when its source
 * family is enabled and present in the response, derived client-side with
 * no new endpoint.
 */
export function OverviewTiles({stats}: {stats: StatsResult}) {
    const tiles: Tile[] = [];
    const searches = totalSearches(stats);
    if (searches !== undefined) {
        tiles.push({
            key: "searches",
            label: "Total searches",
            value: formatCount(searches),
            testId: "stats-tile-total-searches",
        });
    }
    const downloads = totalDownloads(stats);
    if (downloads !== undefined) {
        tiles.push({
            key: "downloads",
            label: "Total downloads",
            value: formatCount(downloads),
            testId: "stats-tile-total-downloads",
        });
    }
    const successRate = overallDownloadSuccessRate(stats);
    if (successRate !== undefined) {
        tiles.push({
            key: "success-rate",
            label: "Overall download success rate",
            value: `${successRate.toFixed(1)}%`,
            testId: "stats-tile-download-success-rate",
        });
    }
    const avgResponseTime = averageResponseTimeAcrossIndexers(stats);
    if (avgResponseTime !== undefined) {
        tiles.push({
            key: "response-time",
            label: "Average response time (across indexers)",
            value: `${avgResponseTime.toFixed(0)} ms`,
            testId: "stats-tile-avg-response-time",
        });
    }
    if (tiles.length === 0) return null;
    return (
        <Stack
            data-testid="stats-overview-tiles"
            direction="row"
            flexWrap="wrap"
            gap={2}
        >
            {tiles.map((tile) => (
                <Card
                    data-testid={tile.testId}
                    key={tile.key}
                    sx={{flex: "1 1 200px", minWidth: 200}}
                    variant="outlined"
                >
                    <CardContent>
                        <Typography color="text.secondary" variant="body2">
                            {tile.label}
                        </Typography>
                        <Typography component="p" variant="h4">
                            {tile.value}
                        </Typography>
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}

function formatCount(value: number): string {
    return new Intl.NumberFormat(undefined, {maximumFractionDigits: 0}).format(
        value,
    );
}
