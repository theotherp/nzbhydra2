import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";

import {ExternalTextLink} from "./ExternalTextLink";
import type {FailedBackupDetails, StartupWarning} from "./startupCheckRunner";

const JAVA_DOWNLOAD_URL = "https://adoptium.net/";
const RELEASES_URL = "https://github.com/theotherp/nzbhydra2/releases/latest";

const WINDOWS_WRAPPER_FILES = ["NZBHydra2.exe", "NZBHydra2 Console.exe"];
const LINUX_WRAPPER_FILES = [
    "nzbhydra2",
    "nzbhydra2wrapper.py",
    "nzbhydra2wrapperPy3.py",
];

const TITLES: Record<StartupWarning, string> = {
    belowJava17: "Java version below 17",
    failedBackup: "Failed backup",
    openToInternet: "Security issue - open to internet",
    outOfMemory: "Out of memory error detected",
    outdatedWrapper: "Outdated wrappers detected",
};

/**
 * The acknowledgement dialog legacy opened through
 * `ModalService.open(..., {yes: {text: "OK"}}, undefined, "left")` for each
 * startup warning. The wording is legacy's; the links legacy embedded as HTML
 * strings are real anchors here, so no server- or config-derived text is ever
 * injected as markup.
 */
export function StartupCheckDialog({
    dereferer,
    failedBackup,
    onClose,
    warning,
}: {
    dereferer: unknown;
    failedBackup?: FailedBackupDetails;
    onClose: () => void;
    warning: StartupWarning;
}) {
    return (
        <Dialog
            aria-labelledby="hydra-startup-check-title"
            data-testid="startup-check-dialog"
            fullWidth
            maxWidth="sm"
            onClose={onClose}
            open
        >
            <DialogTitle id="hydra-startup-check-title">
                {TITLES[warning]}
            </DialogTitle>
            <DialogContent dividers>
                <WarningBody
                    dereferer={dereferer}
                    failedBackup={failedBackup}
                    warning={warning}
                />
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose} variant="contained">
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function WarningBody({
    dereferer,
    failedBackup,
    warning,
}: {
    dereferer: unknown;
    failedBackup?: FailedBackupDetails;
    warning: StartupWarning;
}) {
    if (warning === "outOfMemory") {
        return (
            <DialogContentText>
                The log indicates that the process ran out of memory. Please
                increase the XMX value in the main config and restart.
            </DialogContentText>
        );
    }
    if (warning === "openToInternet") {
        return (
            <DialogContentText>
                It looks like NZBHydra is exposed to the internet without any
                authentication enable. Please make sure it cannot be reached
                from outside your network or enable an authentication method.
            </DialogContentText>
        );
    }
    if (warning === "belowJava17") {
        return (
            <DialogContentText>
                You&apos;re currently running NZBHydra2 with an older java
                version. A future update will require Java 17. Please install{" "}
                <ExternalTextLink dereferer={dereferer} url={JAVA_DOWNLOAD_URL}>
                    Java 17
                </ExternalTextLink>{" "}
                (not higher) from here.
            </DialogContentText>
        );
    }
    if (warning === "failedBackup") {
        return (
            <DialogContentText>
                The creation of a backup file has failed. Error message: &quot;
                {failedBackup?.message ?? ""}.&quot;
                <br />
                For details please check the log around{" "}
                {failedBackup?.time ?? ""}.
            </DialogContentText>
        );
    }
    return <OutdatedWrapperBody dereferer={dereferer} />;
}

function OutdatedWrapperBody({dereferer}: {dereferer: unknown}) {
    return (
        <>
            <DialogContentText>
                The NZBHydra wrappers (i.e. the executables or python scripts
                you use to run NZBHydra) seem to be outdated. Please update
                them.
            </DialogContentText>
            <DialogContentText sx={{mt: 2}}>
                Shut down NZBHydra,{" "}
                <ExternalTextLink dereferer={dereferer} url={RELEASES_URL}>
                    download the latest version
                </ExternalTextLink>{" "}
                and extract all the relevant wrapper files into your main
                NZBHydra folder.
            </DialogContentText>
            <WrapperFiles
                files={WINDOWS_WRAPPER_FILES}
                platform="For Windows these files are:"
            />
            <WrapperFiles
                files={LINUX_WRAPPER_FILES}
                platform="For linux these files are:"
            />
            <DialogContentText sx={{mt: 2}}>
                Make sure to overwrite all of these files that already exist -
                you don&apos;t need to update any files that aren&apos;t already
                present.
            </DialogContentText>
            <DialogContentText sx={{mt: 2}}>
                Afterwards start NZBHydra again.
            </DialogContentText>
        </>
    );
}

function WrapperFiles({files, platform}: {files: string[]; platform: string}) {
    return (
        <>
            <DialogContentText sx={{mt: 2}}>{platform}</DialogContentText>
            <Box component="ul" sx={{mb: 0, mt: 1, pl: 3}}>
                {files.map((file) => (
                    <DialogContentText component="li" key={file}>
                        {file}
                    </DialogContentText>
                ))}
            </Box>
        </>
    );
}
