import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Link,
} from "@mui/material";
import {Link as RouterLink} from "@tanstack/react-router";

import {ExternalTextLink} from "./ExternalTextLink";

const WIKI_URL = "https://github.com/theotherp/nzbhydra2/wiki";
const ISSUES_URL = "https://github.com/theotherp/nzbhydra2/issues";

/**
 * Legacy's `welcome-modal.html`, shown once on the very first start.
 *
 * Legacy's "migrate your data" link to the NZBHydra 1 (python) migration
 * wizard is deliberately omitted: no feature record inventories that wizard,
 * so there is nothing to link to yet (FM-079's Out Of Scope).
 */
export function WelcomeDialog({
    dereferer,
    onClose,
}: {
    dereferer: unknown;
    onClose: () => void;
}) {
    return (
        <Dialog
            aria-labelledby="hydra-welcome-title"
            data-testid="welcome-dialog"
            fullWidth
            maxWidth="sm"
            onClose={onClose}
            open
        >
            <DialogTitle id="hydra-welcome-title">
                Welcome to NZBHydra 2
            </DialogTitle>
            <DialogContent dividers>
                <DialogContentText>
                    This seems to be the first time that you started NZBHydra 2.
                </DialogContentText>
                <DialogContentText sx={{mt: 2}}>
                    You can start by{" "}
                    <Link
                        component={RouterLink}
                        onClick={onClose}
                        to="/config/main"
                    >
                        configuring NZBHydra 2
                    </Link>
                    .
                    <br />
                    You will not be able to use it until you&apos;ve added at
                    least one indexer.
                </DialogContentText>
                <DialogContentText sx={{mt: 2}}>
                    If you&apos;re stuck you can refer to{" "}
                    <ExternalTextLink dereferer={dereferer} url={WIKI_URL}>
                        the wiki
                    </ExternalTextLink>{" "}
                    or the online help (available from the config).
                    <br />
                    If you haven&apos;t found an answer there you&apos;re
                    welcome to{" "}
                    <ExternalTextLink dereferer={dereferer} url={ISSUES_URL}>
                        raise a GitHub issue
                    </ExternalTextLink>
                    .
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose} variant="contained">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
