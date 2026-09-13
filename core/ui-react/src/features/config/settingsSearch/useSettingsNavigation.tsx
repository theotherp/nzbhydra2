import {GlobalStyles} from "@mui/material";
import {useNavigate} from "@tanstack/react-router";
import {useCallback, useEffect, useState, type ReactNode} from "react";

import {
    NO_ADVANCED_REVEAL_REQUEST,
    type AdvancedRevealRequest,
} from "../components/advancedDisclosure";
import {settingsIndexHref, type SettingsIndexEntry} from "./settingsIndex";

/**
 * `C-CONFIG-SETTINGS-INDEX`'s navigation side: what happens after a hit is
 * picked — route to its tab, ask its fieldset to reveal it if an advanced gate
 * is hiding it, scroll it into view, and mark it briefly so the eye lands on
 * the right row among fifty identical-looking ones.
 *
 * The three steps cannot be one synchronous act: the target tab is not mounted
 * yet when the route changes, and a revealed row appears only on the render
 * after the fieldset opens. The anchor is therefore polled for until it exists
 * or the deadline passes, rather than assumed present.
 */

/**
 * How long to keep looking for the anchor. Not a design value: it is the
 * budget for a route change plus one reveal render, generous enough for a slow
 * machine and short enough that a target which will never appear (a
 * conditional row whose condition is unmet) stops being waited for rather than
 * leaving a timer running for the rest of the visit.
 */
const ANCHOR_DEADLINE_MS = 2000;

/** Retry cadence while waiting for the anchor; one frame at 60Hz, rounded. */
const ANCHOR_RETRY_MS = 16;

/**
 * How long the landed-on row stays marked. Not a design value either: long
 * enough to be noticed after a scroll, short enough that it has faded before
 * the admin starts editing, so it can never be mistaken for a state of the
 * setting itself.
 */
const HIGHLIGHT_MS = 2200;

export type SettingsNavigation = {
    /**
     * The temporary highlight, as an element to render inside the config area.
     * `null` while nothing is highlighted.
     */
    highlight: ReactNode;
    /** Feed to `AdvancedRevealRequestContext` above the tab bodies. */
    revealRequest: AdvancedRevealRequest;
    /** Route to the entry's tab, reveal it, scroll to it, highlight it. */
    navigateToSetting: (entry: SettingsIndexEntry) => void;
};

export function useSettingsNavigation(): SettingsNavigation {
    const navigate = useNavigate();
    const [revealRequest, setRevealRequest] = useState<AdvancedRevealRequest>(
        NO_ADVANCED_REVEAL_REQUEST,
    );
    const [pendingAnchor, setPendingAnchor] = useState<{
        testId: string;
        // Distinct per request, so picking the same setting twice re-runs the
        // scroll effect instead of settling on an unchanged state value.
        token: number;
    } | null>(null);
    const [highlightTestId, setHighlightTestId] = useState<string | null>(null);

    const navigateToSetting = useCallback(
        (entry: SettingsIndexEntry) => {
            void navigate({to: settingsIndexHref(entry)});
            setRevealRequest((previous) => ({
                // Only an advanced entry can be behind a gate, and only a
                // fieldset can hold one -- a tab-level row has nothing that
                // could reveal it, which is FM-098's documented boundary.
                fieldset:
                    entry.advanced && entry.fieldset !== null
                        ? entry.fieldset
                        : null,
                token: previous.token + 1,
            }));
            setHighlightTestId(null);
            setPendingAnchor((previous) => ({
                testId: entry.anchorTestId,
                token: (previous?.token ?? 0) + 1,
            }));
        },
        [navigate],
    );

    useEffect(() => {
        if (pendingAnchor === null) {
            return undefined;
        }
        const deadline = Date.now() + ANCHOR_DEADLINE_MS;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;
        const attempt = () => {
            if (cancelled) {
                return;
            }
            const target = document.querySelector(
                `[data-testid="${pendingAnchor.testId}"]`,
            );
            // jsdom implements no layout, and therefore neither
            // `scrollIntoView` nor a meaningful height: its absence is what
            // distinguishes a real browser here, so a component test asserting
            // the navigation does not fail on the browser-only half of it.
            const hasLayout =
                target !== null && typeof target.scrollIntoView === "function";
            if (
                target !== null &&
                // A row revealed by an advanced expander mounts inside a
                // `Collapse` that is still opening, so for a moment it is on
                // the page with no height at all. Scrolling to it then aims at
                // where it is not going to be; waiting for it to have a box
                // costs one or two frames and lands on the right place.
                (!hasLayout || target.getBoundingClientRect().height > 0)
            ) {
                if (hasLayout) {
                    target.scrollIntoView({block: "center"});
                }
                setHighlightTestId(pendingAnchor.testId);
                setPendingAnchor(null);
                return;
            }
            if (Date.now() >= deadline) {
                setPendingAnchor(null);
                return;
            }
            timer = setTimeout(attempt, ANCHOR_RETRY_MS);
        };
        attempt();
        return () => {
            cancelled = true;
            if (timer !== undefined) {
                clearTimeout(timer);
            }
        };
    }, [pendingAnchor]);

    useEffect(() => {
        if (highlightTestId === null) {
            return undefined;
        }
        const timer = setTimeout(() => setHighlightTestId(null), HIGHLIGHT_MS);
        return () => clearTimeout(timer);
    }, [highlightTestId]);

    return {
        highlight:
            highlightTestId === null ? null : (
                <SettingHighlight testId={highlightTestId} />
            ),
        navigateToSetting,
        revealRequest,
    };
}

/**
 * The mark itself, as a scoped global rule rather than a prop threaded through
 * `SettingRow`: the row that has to be marked is inside whichever tab body the
 * router mounted, and the only thing this feature knows about it is the
 * `data-testid` the index already stores. `GlobalStyles` is stock MUI and the
 * rule is built from palette and spacing tokens only (ADR-0014).
 *
 * `boxShadow` rather than padding or a border: a spread shadow paints the mark
 * *outside* the row's box without changing its size, so nothing on the page
 * moves when a row lights up and fades again. It is not an `outline` and never
 * a focus style -- focus indication stays the theme's (ADR-0013/0015).
 *
 * The spread is `spacing(1.5)` rather than `spacing(1)` for a measured reason,
 * not a decorative one: a `TextField`'s floating label is translated *above*
 * its form control's box, so it sits outside the row's border box. At
 * `spacing(1)` the mark's edge ran through the middle of that label and cut it
 * in half (seen in the first `search-highlight-desktop` capture); `spacing(1.5)`
 * clears it. Still a theme step, not a literal.
 */
function SettingHighlight({testId}: {testId: string}) {
    return (
        <GlobalStyles
            styles={(theme) => ({
                [`[data-testid="${testId}"]`]: {
                    backgroundColor: theme.palette.action.selected,
                    borderRadius: theme.shape.borderRadius,
                    boxShadow: `0 0 0 ${theme.spacing(1.5)} ${theme.palette.action.selected}`,
                },
            })}
        />
    );
}
