import {useEffect, useRef, useState} from "react";

import {ApiTransport} from "../../api/transport";
import {useSafeConfig, type BootstrapData} from "../../bootstrap";
import {useToasts} from "../../components/toasts/toasts";
import {createServerPreferences} from "../../services/preferences/serverPreferences";
import {NewsDialog} from "./NewsDialog";
import {StartupCheckDialog} from "./StartupCheckDialog";
import {runStartupChecks, type StartupAnnouncement} from "./startupCheckRunner";
import {UserNewsDialog} from "./UserNewsDialog";
import {WelcomeDialog} from "./WelcomeDialog";

/**
 * `F-PLATFORM-LIVE-STATUS`' startup half: legacy's `hydra-checks-footer.js`
 * checks, run once per application load rather than per route change — this
 * component is mounted by the shell, which the router keeps mounted across
 * navigations, and the sequence itself is guarded so it starts exactly once.
 *
 * The sequence asks for one announcement at a time and waits for it to be
 * closed, which is what makes the ordering contract observable.
 */
export function StartupChecks({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const safeConfig = useSafeConfig(bootstrap);
    const {showToast} = useToasts();
    const [announcement, setAnnouncement] =
        useState<StartupAnnouncement | null>(null);
    const closeAnnouncement = useRef<(() => void) | null>(null);
    const started = useRef(false);
    // The sequence reads the live safe configuration and the live toast
    // function at the moment it needs them, without restarting when either
    // identity changes.
    const latest = useRef({safeConfig, showToast});
    latest.current = {safeConfig, showToast};

    // Owner defect (2026-09-18): on a FORM login screen every check below ran
    // against a server that refuses it, and the refusal arrived as a redirect
    // to `/login` whose HTML body the transport handed back as the answer --
    // so the welcome flag read as "not shown yet" and the dialog opened over
    // the login form on every visit.
    //
    // What actually fixes that is the server, which now answers a background
    // request with a 401 (`BackgroundRequestAuthenticationEntryPoint`). This
    // flag is the cheaper half: don't send requests that cannot be answered.
    // It is deliberately a *sufficient* condition, not an exact one --
    // `maySeeSearch` is `false` only when `restrictSearch` is on and this
    // session matched no configured user (`UserInfosProvider`), which is the
    // login screen and implies no `ROLE_USER`
    // (`HydraAnonymousAuthenticationFilter`). The reverse does not hold: with
    // an empty users list `maySeeSearch` is `true` while `ROLE_USER` is still
    // withheld, and those checks run and are refused -- harmlessly, because
    // each one is wrapped in `contained()`. Every session that can use the
    // application runs them exactly as before, a logged-in one under
    // `restrictSearch` included.
    const mayRunChecks = bootstrap.maySeeSearch !== false;

    useEffect(() => {
        if (started.current || !mayRunChecks) {
            return;
        }
        started.current = true;
        void runStartupChecks({
            isAdmin: bootstrap.maySeeAdmin === true,
            preferences: createServerPreferences(transport),
            get safeConfig() {
                return latest.current.safeConfig;
            },
            show: (next) =>
                new Promise<void>((resolve) => {
                    closeAnnouncement.current = resolve;
                    setAnnouncement(next);
                }),
            toast: (toast) => latest.current.showToast(toast),
            transport,
        });
    }, [bootstrap.maySeeAdmin, mayRunChecks, transport]);

    if (announcement === null) {
        return null;
    }

    const onClose = () => {
        setAnnouncement(null);
        const resolve = closeAnnouncement.current;
        closeAnnouncement.current = null;
        resolve?.();
    };
    const dereferer = safeConfig?.dereferer;

    if (announcement.kind === "welcome") {
        return <WelcomeDialog dereferer={dereferer} onClose={onClose} />;
    }
    if (announcement.kind === "news") {
        return <NewsDialog entries={announcement.entries} onClose={onClose} />;
    }
    if (announcement.kind === "userNews") {
        return <UserNewsDialog entry={announcement.entry} onClose={onClose} />;
    }
    return (
        <StartupCheckDialog
            dereferer={dereferer}
            failedBackup={announcement.failedBackup}
            onClose={onClose}
            warning={announcement.warning}
        />
    );
}
