import {
    Alert,
    CircularProgress,
    Link,
    List,
    ListItem,
    Stack,
    Typography,
} from "@mui/material";
import {useQuery} from "@tanstack/react-query";

import {getLogFileNames, logFileDownloadUrl} from "../../../api/system/logs";
import {ApiTransport} from "../../../api/transport";

/**
 * Legacy's Files view (`log.html:81-94`): every file in the log directory,
 * newest first, each a direct download from `API-SYSTEM-LOG-DOWNLOAD`. The
 * browser fetches it itself, so the file keeps its name and a large rotated
 * log never has to pass through the application as a blob.
 */
export function LogFilesView({transport}: {transport: ApiTransport}) {
    const files = useQuery({
        queryFn: () => getLogFileNames(transport),
        queryKey: ["system-log-files"],
    });

    return (
        <Stack data-testid="system-log-view-files" spacing={2}>
            {files.isPending && (
                <Stack
                    role="status"
                    spacing={2}
                    sx={{
                        alignItems: "center",
                    }}
                >
                    <CircularProgress variant="indeterminate" />
                    <Typography>Loading the log files</Typography>
                </Stack>
            )}
            {files.isError && (
                <Alert severity="error">Unable to load the log files.</Alert>
            )}
            {files.isSuccess && files.data.length === 0 && (
                <Typography>No log files are available.</Typography>
            )}
            {files.isSuccess && files.data.length > 0 && (
                <List>
                    {files.data.map((name, index) => (
                        <ListItem disableGutters key={name}>
                            <Link
                                data-testid={`system-log-file-${index}`}
                                href={logFileDownloadUrl(transport, name)}
                                rel="noreferrer"
                                target="_blank"
                            >
                                {name}
                            </Link>
                        </ListItem>
                    ))}
                </List>
            )}
        </Stack>
    );
}
