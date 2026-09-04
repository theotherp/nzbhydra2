import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
    Alert,
    Button,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {getTasks, runTask, type SystemTask} from "../../../api/system/tasks";
import {ApiTransport} from "../../../api/transport";
import type {BootstrapData} from "../../../bootstrap";
import {useToasts} from "../../../components/toasts/toasts";
import {
    formatServerDateTime,
    parseServerDateTime,
} from "../../../domain/date-time/dateTime";
import {formatRelativeTime} from "./relativeTime";

const TASKS_QUERY_KEY = ["system-tasks"];
const LOAD_FAILURE = "Unable to load the scheduled tasks.";
const RUN_FAILURE = "Unable to run the task.";

/**
 * `F-SYSTEM-TASKS`: legacy's `hydraTasks` directive (`tasks.js`,
 * `tasks.html`) as the shell's Tasks tab. One GET lists the scheduled tasks;
 * each row's run action PUTs `API-SYSTEM-TASK-RUN` for that task and replaces
 * the whole list with the response, the same as legacy's `runTask` assigning
 * straight over `$scope.tasks` rather than re-fetching.
 */
export function SystemTasksTab({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const toasts = useToasts();
    const queryClient = useQueryClient();
    const [runningTask, setRunningTask] = useState<string | null>(null);
    const tasks = useQuery({
        queryFn: () => getTasks(transport),
        queryKey: TASKS_QUERY_KEY,
    });

    const run = async (taskName: string) => {
        setRunningTask(taskName);
        try {
            const refreshed = await runTask(transport, taskName);
            queryClient.setQueryData(TASKS_QUERY_KEY, refreshed);
        } catch {
            toasts.showToast({message: RUN_FAILURE, severity: "error"});
        } finally {
            setRunningTask(null);
        }
    };

    return (
        <Stack data-testid="system-tasks" spacing={2}>
            {tasks.isPending && (
                <Stack
                    role="status"
                    spacing={2}
                    sx={{
                        alignItems: "center",
                    }}
                >
                    <CircularProgress variant="indeterminate" />
                    <Typography>Loading the scheduled tasks</Typography>
                </Stack>
            )}
            {tasks.isError && <Alert severity="error">{LOAD_FAILURE}</Alert>}
            {tasks.isSuccess && (
                <TableContainer>
                    <Table data-testid="system-tasks-table" size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Last execution</TableCell>
                                <TableCell>Next execution</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tasks.data.map((task) => (
                                <TaskRow
                                    busy={runningTask === task.name}
                                    key={task.name}
                                    onRun={() => void run(task.name)}
                                    serverTimeZone={bootstrap.serverTimeZone}
                                    task={task}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Stack>
    );
}

function TaskRow({
    busy,
    onRun,
    serverTimeZone,
    task,
}: {
    busy: boolean;
    onRun: () => void;
    serverTimeZone: string | null;
    task: SystemTask;
}) {
    return (
        <TableRow>
            <TableCell>
                <Button
                    data-testid="system-task-run"
                    disabled={busy}
                    onClick={onRun}
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    type="button"
                >
                    {task.name}
                </Button>
            </TableCell>
            <TableCell>
                <ExecutionTimeCell
                    serverTimeZone={serverTimeZone}
                    value={task.lastExecutionTime}
                />
            </TableCell>
            <TableCell>
                <ExecutionTimeCell
                    serverTimeZone={serverTimeZone}
                    value={task.nextExecutionTime}
                />
            </TableCell>
        </TableRow>
    );
}

/**
 * Legacy's `humanizeDate` + `reformatDateSeconds` pairing (`tasks.html:14-19`):
 * relative text with the absolute server-timezone timestamp as the hover
 * tooltip. A null value (only `lastExecutionTime`, before a task has ever
 * run) renders as an empty cell with no tooltip at all, rather than a tooltip
 * with nothing useful in it.
 */
function ExecutionTimeCell({
    serverTimeZone,
    value,
}: {
    serverTimeZone: string | null;
    value: string | number | null;
}) {
    if (value === null) {
        return null;
    }
    const date = parseServerDateTime(value, serverTimeZone);
    if (!date) {
        return null;
    }
    return (
        <Tooltip title={formatServerDateTime(value, serverTimeZone)}>
            <span>{formatRelativeTime(date)}</span>
        </Tooltip>
    );
}
