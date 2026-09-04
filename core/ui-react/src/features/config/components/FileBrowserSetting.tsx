import DriveFolderUploadIcon from "@mui/icons-material/DriveFolderUpload";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import {
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";
import {useController, useFormContext} from "react-hook-form";

import {
    getFolderListing,
    type FolderListingMode,
} from "../../../api/config/folderListing";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {SettingRow} from "./SettingRow";
import {
    settingDescribedBy,
    settingInputTestId,
    settingRules,
    settingTestId,
    textValue,
    type SettingProps,
} from "./settings";

type ListingRequest = {fullPath: string | null; goUp: boolean};

/**
 * `C-CONFIG-FIELDS`: a path setting with a server-side browser (legacy's
 * `fileInput` plus `file-selection-service.js`). The listing has to come from
 * the server through `API-CONFIG-FOLDER-LISTING` because the paths being
 * configured are the *server's* paths, which no browser file picker can see.
 * The field itself stays freely editable — browsing is an affordance, not the
 * only way to set a path.
 */
export function FileBrowserSetting({
    advanced,
    help,
    label,
    mode,
    name,
    required,
    tooltip,
    transport,
    validate,
}: SettingProps & {
    /** `folder` makes the backend omit files entirely (`FileSystemEntry`). */
    mode: FolderListingMode;
    transport: ApiTransport;
}) {
    const {setValue} = useFormContext<ConfigValues>();
    const {field, fieldState} = useController<ConfigValues>({
        name,
        rules: settingRules({required, validate}),
    });
    const [browsing, setBrowsing] = useState(false);

    const choose = (path: string) => {
        setValue(name, path, {shouldDirty: true, shouldValidate: true});
        setBrowsing(false);
    };

    return (
        <SettingRow
            advanced={advanced}
            error={fieldState.error?.message}
            help={help}
            label={label}
            name={name}
            tooltip={tooltip}
        >
            <TextField
                error={fieldState.error !== undefined}
                fullWidth
                inputRef={field.ref}
                label={label}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                required={required}
                slotProps={{
                    htmlInput: {"data-testid": settingInputTestId(name)},
                    input: {
                        "aria-describedby": settingDescribedBy(name, {
                            hasError: fieldState.error !== undefined,
                            hasHelp: help !== undefined,
                        }),
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label={`Browse for ${label}`}
                                    data-testid={`config-file-browse-${settingTestId(name)}`}
                                    onClick={() => setBrowsing(true)}
                                    size="small"
                                >
                                    <FolderOpenIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
                value={textValue(field.value)}
            />
            {browsing ? (
                <FileBrowserDialog
                    mode={mode}
                    onCancel={() => setBrowsing(false)}
                    onSelect={choose}
                    startPath={
                        typeof field.value === "string" && field.value !== ""
                            ? field.value
                            : null
                    }
                    transport={transport}
                />
            ) : null}
        </SettingRow>
    );
}

function FileBrowserDialog({
    mode,
    onCancel,
    onSelect,
    startPath,
    transport,
}: {
    mode: FolderListingMode;
    onCancel: () => void;
    onSelect: (path: string) => void;
    startPath: string | null;
    transport: ApiTransport;
}) {
    const [request, setRequest] = useState<ListingRequest>({
        fullPath: startPath,
        goUp: false,
    });
    const listing = useQuery({
        queryKey: ["config", "folderListing", mode, request] as const,
        queryFn: () => getFolderListing(transport, {...request, type: mode}),
        // The filesystem is not application state: a cached listing would show
        // folders that no longer exist the next time the dialog is opened.
        gcTime: 0,
        staleTime: 0,
    });
    const entry = listing.data;

    return (
        <Dialog
            data-testid="config-file-browser-dialog"
            fullWidth
            maxWidth="sm"
            onClose={onCancel}
            open
        >
            <DialogTitle>
                {mode === "file" ? "File selection" : "Folder selection"}
            </DialogTitle>
            <DialogContent dividers>
                <Typography
                    data-testid="config-file-browser-path"
                    gutterBottom
                    variant="body2"
                >
                    {entry?.fullPath ?? ""}
                </Typography>
                {listing.isPending ? (
                    <Stack
                        role="status"
                        sx={{
                            alignItems: "center",
                            py: 3,
                        }}
                    >
                        <CircularProgress variant="indeterminate" />
                    </Stack>
                ) : null}
                {listing.isError ? (
                    <Alert severity="error">
                        Unable to list this directory.
                    </Alert>
                ) : null}
                {entry === undefined ? null : (
                    <List dense>
                        {entry.hasParent ? (
                            <ListItemButton
                                data-testid="config-file-browser-up"
                                onClick={() =>
                                    setRequest({
                                        fullPath: entry.fullPath,
                                        goUp: true,
                                    })
                                }
                            >
                                <ListItemIcon>
                                    <DriveFolderUploadIcon />
                                </ListItemIcon>
                                <ListItemText primary="Parent directory" />
                            </ListItemButton>
                        ) : null}
                        {entry.folders.map((folder) => (
                            <ListItemButton
                                data-testid="config-file-browser-folder"
                                key={folder.fullPath}
                                onClick={() =>
                                    setRequest({
                                        fullPath: folder.fullPath,
                                        goUp: false,
                                    })
                                }
                            >
                                <ListItemIcon>
                                    <FolderOpenIcon />
                                </ListItemIcon>
                                <ListItemText primary={folder.name} />
                            </ListItemButton>
                        ))}
                        {entry.files.map((file) => (
                            <ListItemButton
                                data-testid="config-file-browser-file"
                                key={file.fullPath}
                                onClick={() => onSelect(file.fullPath)}
                            >
                                <ListItemIcon>
                                    <InsertDriveFileOutlinedIcon />
                                </ListItemIcon>
                                <ListItemText primary={file.name} />
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                {mode === "folder" ? (
                    <Button
                        data-testid="config-file-browser-select"
                        disabled={entry === undefined}
                        onClick={() => {
                            if (entry !== undefined) {
                                onSelect(entry.fullPath);
                            }
                        }}
                        variant="contained"
                    >
                        Select this folder
                    </Button>
                ) : null}
            </DialogActions>
        </Dialog>
    );
}
