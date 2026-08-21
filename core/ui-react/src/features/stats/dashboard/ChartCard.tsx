import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
    Button,
    Card,
    CardContent,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import {useState, type ReactNode} from "react";

/**
 * A dashboard family's card: a chart as the primary rendering, with an
 * accessible table for the same values reachable behind a "View data"
 * toggle (Presentation Structure item 7: tables are the accessibility layer
 * for charts).
 */
export function ChartCard({
    title,
    help,
    chart,
    table,
    testId,
}: {
    title: string;
    help?: string;
    chart: ReactNode;
    table: ReactNode;
    testId?: string;
}) {
    const [showTable, setShowTable] = useState(false);
    return (
        <Card data-testid={testId} variant="outlined">
            <CardContent>
                <Stack
                    alignItems="center"
                    direction="row"
                    justifyContent="space-between"
                    spacing={1}
                >
                    <Stack alignItems="center" direction="row" spacing={0.5}>
                        <Typography component="h3" variant="subtitle1">
                            {title}
                        </Typography>
                        {help && (
                            <Tooltip title={help}>
                                <HelpOutlineIcon
                                    aria-label={`About ${title}`}
                                    fontSize="small"
                                    sx={{color: "text.secondary"}}
                                />
                            </Tooltip>
                        )}
                    </Stack>
                    <Button
                        aria-expanded={showTable}
                        onClick={() => setShowTable((current) => !current)}
                        size="small"
                    >
                        {showTable ? "Hide data" : "View data"}
                    </Button>
                </Stack>
                <Stack sx={{mt: 1.5}}>{showTable ? table : chart}</Stack>
            </CardContent>
        </Card>
    );
}
