import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import {
    Box,
    Button,
    Card,
    CardContent,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import {useEffect, useRef, useState, type ReactNode} from "react";

/**
 * How far ahead of the viewport a card starts building its chart, so a reader
 * scrolling at a normal pace meets a drawn chart rather than a placeholder
 * catching up.
 */
const MOUNT_ROOT_MARGIN = "400px";

/**
 * A dashboard family's card: a chart as the primary rendering, with an
 * accessible table for the same values reachable behind a "View data"
 * toggle (Presentation Structure item 7: tables are the accessibility layer
 * for charts).
 *
 * FM-164: the chart arm is mounted only once the card reaches the viewport.
 * Until then the card holds a placeholder of the chart's own height
 * (`chartHeight`, derived from the chart's real sizing rule, never guessed),
 * so the page is exactly as tall at first paint as it will be once every
 * chart has arrived and nothing below a card moves as it mounts. A chart that
 * has been mounted is never unmounted by scrolling, and where
 * `IntersectionObserver` is absent (jsdom, older embedded browsers) every
 * chart mounts eagerly -- the deferral degrades to the previous behavior, not
 * to a blank dashboard. ADR-0021 is unaffected either way: every statistic
 * stays reachable through the table arm, which is never gated.
 */
export function ChartCard({
    title,
    help,
    chart,
    chartHeight,
    table,
    testId,
}: {
    title: string;
    help?: string;
    chart: ReactNode;
    chartHeight: number;
    table: ReactNode;
    testId?: string;
}) {
    const [showTable, setShowTable] = useState(false);
    const [chartMounted, setChartMounted] = useState(
        () => typeof IntersectionObserver === "undefined",
    );
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // A card showing its table arm has no chart to prepare; it mounts one
        // the moment the reader toggles back, without consulting visibility.
        if (chartMounted || showTable) return;
        const element = cardRef.current;
        if (!element) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setChartMounted(true);
                }
            },
            {rootMargin: MOUNT_ROOT_MARGIN},
        );
        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, [chartMounted, showTable]);

    const handleToggle = () => {
        // Toggling back to the chart is itself proof the card is in view.
        if (showTable) setChartMounted(true);
        setShowTable((current) => !current);
    };

    return (
        <Card data-testid={testId} ref={cardRef} variant="outlined">
            <CardContent>
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{
                            alignItems: "center",
                        }}
                    >
                        <Typography component="h3" variant="subtitle1">
                            {title}
                        </Typography>
                        {help && (
                            <Tooltip title={help}>
                                <HelpOutlineOutlinedIcon
                                    aria-label={`About ${title}`}
                                    fontSize="small"
                                    sx={{color: "text.secondary"}}
                                />
                            </Tooltip>
                        )}
                    </Stack>
                    <Button
                        aria-expanded={showTable}
                        onClick={handleToggle}
                        size="small"
                    >
                        {showTable ? "Hide data" : "View data"}
                    </Button>
                </Stack>
                <Stack sx={{mt: 1.5}}>
                    {showTable ? (
                        table
                    ) : chartMounted ? (
                        <Box
                            data-testid={testId ? `${testId}-chart` : undefined}
                        >
                            {chart}
                        </Box>
                    ) : (
                        <Box
                            aria-hidden
                            data-testid={
                                testId ? `${testId}-placeholder` : undefined
                            }
                            sx={{height: chartHeight}}
                        />
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}
