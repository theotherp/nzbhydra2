import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import {Box, Link, Stack, Tooltip, Typography} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import type {
    DownloaderStatus,
    DownloaderStatusLiveTransport,
} from "../../api/live/downloaderStatus";
import type {LiveSubscription} from "../../api/live/transport";
import {useSafeConfig, type BootstrapData} from "../../bootstrap";
import {
    advancedRateWindow,
    appendBufferedRates,
    bufferRate,
    downloaderStateKind,
    downloaderStateLabel,
    isRateWindowUniform,
    nextRateWindow,
    showsDownloaderStatus,
    type DownloaderStateKind,
} from "./downloaderFooter";

// Vite asset references, like the shell's own logo. The three downloader logos
// are vendored into the React bundle (rather than pointed at legacy's
// `static/img/...`) for the same reason `SystemAboutTab` vendors its image:
// the React build owns its assets. They live beside this component because
// this packet's allowed files do not reach `src/assets`.
const DOWNLOADER_LOGOS: Record<string, string> = {
    NZBGET: new URL("./downloaders/nzbgetlogo.png", import.meta.url).href,
    SABNZBD: new URL("./downloaders/sabnzbdlogo.png", import.meta.url).href,
    TORBOX: new URL("./downloaders/torboxlogo.png", import.meta.url).href,
};

const STATE_ICONS: Record<DownloaderStateKind, typeof PlayArrowIcon> = {
    downloading: PlayArrowIcon,
    offline: PowerSettingsNewIcon,
    other: AccessTimeIcon,
    paused: PauseIcon,
};

const SELF_ADVANCE_INTERVAL_MS = 1_000;
const CHART_HEIGHT = 34;
const CHART_WIDTH = 220;

/**
 * FM-163: the graph is the only part of this footer that costs anything to
 * load — `@mui/x-charts` and the `d3-*` packages under it — and the footer is
 * mounted by the shell on every route, so a static import would hand that cost
 * to every session including one that only searches. State, queue and title
 * stay eager; only the graph is deferred, and its `Suspense` fallback below
 * occupies exactly the box the chart will occupy, so nothing moves when the
 * chunk arrives.
 */
const DownloaderRateSparkline = lazy(() => import("./DownloaderRateSparkline"));

/**
 * `C-DOWNLOADER-STATUS`: legacy's `downloaderStatusFooter.js` and
 * `downloader-status-footer.html` as a permanent shell subscriber. Mounted by
 * the shell so the subscription survives navigation, and gated on the reactive
 * safe config so turning the setting off (or disabling every downloader)
 * removes it without a reload.
 *
 * A connection that never comes up degrades silently: no footer, no error
 * surface — legacy showed nothing either, and this is decoration around a
 * feature that keeps working without it.
 */
export function DownloaderStatusFooter({
    bootstrap,
    liveTransport,
    onHeightChange,
}: {
    bootstrap: BootstrapData;
    liveTransport: DownloaderStatusLiveTransport;
    onHeightChange: (height: number) => void;
}) {
    const theme = useTheme();
    const visible = showsDownloaderStatus(useSafeConfig(bootstrap));
    const [status, setStatus] = useState<DownloaderStatus>();
    const [rates, setRates] = useState<number[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // The live window, the buffer a hidden tab fills, and the self-advance
    // timer are all read and written from callbacks that outlive a render, so
    // they are kept in refs and mirrored into state only to paint.
    const ratesRef = useRef<number[]>([]);
    const bufferedRef = useRef<number[]>([]);
    const latestStatusRef = useRef<DownloaderStatus | undefined>(undefined);
    const intervalRef = useRef<number | null>(null);

    const stopSelfAdvance = useCallback(() => {
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const publishRates = useCallback((next: number[]) => {
        ratesRef.current = next;
        setRates(next);
    }, []);

    /**
     * Legacy's `updateFooter`. The interval bookkeeping deliberately runs
     * before the `downloaderType` guard, as it does in legacy: a status
     * without a downloader type still tells us whether updates have stopped.
     */
    const applyStatus = useCallback(
        (next: DownloaderStatus) => {
            if (next.lastUpdateForNow && intervalRef.current === null) {
                // The server has told us it will send nothing new for a while
                // because the last two statuses were identical; keep the graph
                // moving with the last known rate instead of freezing it.
                intervalRef.current = window.setInterval(() => {
                    const rate = latestStatusRef.current?.lastDownloadRate ?? 0;
                    const advanced = advancedRateWindow(ratesRef.current, rate);
                    publishRates(advanced);
                    // First stop condition: the window says nothing but the
                    // last known rate, so advancing again cannot change it.
                    if (isRateWindowUniform(advanced, rate)) {
                        stopSelfAdvance();
                    }
                }, SELF_ADVANCE_INTERVAL_MS);
            } else if (intervalRef.current !== null && !next.lastUpdateForNow) {
                // Second stop condition: real data is flowing again.
                stopSelfAdvance();
            }

            if (
                next.downloaderType === null ||
                next.downloaderType === undefined
            ) {
                // Happens when something goes wrong on the server side; legacy
                // ignored these rather than rendering half a footer.
                return;
            }
            setStatus(next);
            publishRates(nextRateWindow(ratesRef.current, next));
        },
        [publishRates, stopSelfAdvance],
    );

    const receiveStatus = useCallback(
        (next: DownloaderStatus) => {
            latestStatusRef.current = next;
            if (document.hidden) {
                // A background tab neither repaints nor grows without bound:
                // only the rate is kept, in a window of the same size as the
                // graph's own.
                bufferedRef.current = bufferRate(
                    bufferedRef.current,
                    next.lastDownloadRate ?? 0,
                );
                return;
            }
            applyStatus(next);
        },
        [applyStatus],
    );

    useEffect(() => {
        if (!visible) {
            return;
        }
        let cancelled = false;
        let subscription: LiveSubscription | undefined;
        liveTransport
            .subscribeDownloaderStatus(
                (next) => {
                    if (!cancelled) receiveStatus(next);
                },
                () => undefined,
            )
            .then((opened) => {
                if (cancelled) {
                    opened.close();
                    return;
                }
                subscription = opened;
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
            subscription?.close();
            subscription = undefined;
            // Whatever ended the subscription — unmount, or the saved
            // configuration turning the footer off — leaves nothing behind to
            // resume from: no timer, no buffer, no stale status.
            stopSelfAdvance();
            bufferedRef.current = [];
            latestStatusRef.current = undefined;
            ratesRef.current = [];
            setRates([]);
            setStatus(undefined);
        };
    }, [liveTransport, receiveStatus, stopSelfAdvance, visible]);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.hidden) {
                return;
            }
            const buffered = bufferedRef.current;
            bufferedRef.current = [];
            if (buffered.length > 0) {
                publishRates(appendBufferedRates(ratesRef.current, buffered));
            }
            const latest = latestStatusRef.current;
            if (latest !== undefined) {
                applyStatus(latest);
            }
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () =>
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
    }, [applyStatus, publishRates]);

    // The self-advance timer belongs to this mount, whatever started it — the
    // subscription effect above never runs its cleanup when the footer was
    // never visible.
    useEffect(() => stopSelfAdvance, [stopSelfAdvance]);

    const shown = visible && status !== undefined;

    // Reports its rendered height the way `UpdateFooterBanners` does, so the
    // shell can keep both the scroll area and the banners above this footer
    // clear of it.
    useLayoutEffect(() => {
        const node = containerRef.current;
        if (node === null) {
            onHeightChange(0);
            return;
        }
        onHeightChange(node.getBoundingClientRect().height);
        if (typeof ResizeObserver === "undefined") {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            onHeightChange(entry ? entry.contentRect.height : 0);
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [onHeightChange, shown]);

    if (!shown) {
        return null;
    }

    const kind = downloaderStateKind(status.state);
    const stateLabel = downloaderStateLabel(status.state);
    const StateIcon = STATE_ICONS[kind];
    const logo =
        status.downloaderType === null
            ? undefined
            : DOWNLOADER_LOGOS[status.downloaderType];
    const downloaderName = status.downloaderName ?? status.downloaderType ?? "";

    return (
        <Box
            data-testid="downloader-status-footer"
            ref={containerRef}
            sx={{
                bgcolor: "background.paper",
                borderTop: 1,
                borderTopColor: "divider",
                bottom: 0,
                left: 0,
                position: "fixed",
                px: 2,
                py: 0.5,
                right: 0,
                zIndex: (muiTheme) => muiTheme.zIndex.appBar,
            }}
        >
            <Stack
                direction="row"
                spacing={1.5}
                sx={{
                    alignItems: "center",
                }}
            >
                {status.url === null ? (
                    <DownloaderLogo logo={logo} name={downloaderName} />
                ) : (
                    <Link
                        href={status.url}
                        rel="noopener"
                        sx={{display: "inline-flex"}}
                        target="_blank"
                    >
                        <DownloaderLogo logo={logo} name={downloaderName} />
                    </Link>
                )}
                <Tooltip title={stateLabel}>
                    <Box
                        aria-label={stateLabel}
                        component="span"
                        data-testid="downloader-status-state"
                        role="img"
                        sx={{color: "text.secondary", display: "inline-flex"}}
                    >
                        <StateIcon fontSize="small" />
                    </Box>
                </Tooltip>
                {/*
                 * Legacy's single status line: the rate and remaining time
                 * only while downloading, then the queue size unless the
                 * downloader is offline.
                 */}
                <Typography
                    component="span"
                    noWrap
                    sx={{flexShrink: 0}}
                    variant="body2"
                >
                    {kind === "downloading" &&
                    status.downloadRateFormatted !== null &&
                    status.downloadRateFormatted !== ""
                        ? `${status.downloadRateFormatted} • ${status.remainingTimeFormatted ?? ""} • `
                        : ""}
                    {kind === "offline" ? null : (
                        <Box
                            component="span"
                            data-testid="downloader-status-queue"
                        >
                            {status.elementsInQueue} in queue
                        </Box>
                    )}
                </Typography>
                {status.downloadingTitle !== null &&
                status.downloadingTitle !== "" ? (
                    <Typography
                        component="span"
                        noWrap
                        // Legacy hid the title and the graph together below
                        // its `xs` breakpoint (`hidden-xs`), which is what
                        // keeps the state line itself readable on a phone.
                        sx={{
                            display: {md: "block", xs: "none"},
                            flexGrow: 1,
                            minWidth: 0,
                        }}
                        variant="body2"
                    >
                        {status.downloadingTitle} (
                        {status.downloadingTitlePercentFinished}%
                        {status.downloadingTitleRemainingTimeFormatted !==
                            null &&
                        status.downloadingTitleRemainingTimeFormatted !== ""
                            ? ` • ${status.downloadingTitleRemainingTimeFormatted}`
                            : ""}
                        )
                    </Typography>
                ) : (
                    <Box sx={{flexGrow: 1}} />
                )}
                {kind === "offline" || rates.length === 0 ? null : (
                    // Decorative by design (ADR-0021's data-reachability
                    // intent): every value it draws is the rate already
                    // written as text to its left, so the graph itself is
                    // hidden from assistive technology instead of narrating
                    // two hundred numbers.
                    <Box
                        aria-hidden
                        data-testid="downloader-status-rates"
                        sx={{
                            display: {md: "block", xs: "none"},
                            lineHeight: 0,
                        }}
                    >
                        <Suspense
                            fallback={
                                <Box
                                    sx={{
                                        height: CHART_HEIGHT,
                                        width: CHART_WIDTH,
                                    }}
                                />
                            }
                        >
                            <DownloaderRateSparkline
                                color={theme.palette.charts.categorical[0]}
                                data={rates}
                                height={CHART_HEIGHT}
                                width={CHART_WIDTH}
                            />
                        </Suspense>
                    </Box>
                )}
            </Stack>
        </Box>
    );
}

function DownloaderLogo({logo, name}: {logo?: string; name: string}) {
    if (logo === undefined) {
        return (
            <Typography component="span" variant="body2">
                {name}
            </Typography>
        );
    }
    return (
        <Box
            alt={name}
            component="img"
            src={logo}
            sx={{height: 22, width: "auto"}}
        />
    );
}
