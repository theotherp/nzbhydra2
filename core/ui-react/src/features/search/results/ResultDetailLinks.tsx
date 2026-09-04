import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {IconButton, Stack, Tooltip} from "@mui/material";
import type {ReactNode} from "react";
import {useContext, useState} from "react";

import {getNfo} from "../../../api/nfo";
import type {HasNfo, SearchResult} from "../../../api/search";
import {ApiTransport} from "../../../api/transport";
import {ToastContext} from "../../../components/toasts/toasts";
import {externalLink} from "../../../domain/links/externalLinks";
import {NfoDialog} from "./NfoDialog";

/**
 * Legacy's Binsearch query (`core/ui-src/js/nzbhydra.js:865-868`), built from
 * the result's `source` (the usenet poster) and kept byte-for-byte, including
 * its plain-`http` scheme and its empty `server` parameter.
 */
export function binsearchUrl(source: string): string {
    return `http://binsearch.info/?q=${encodeURIComponent(source)}&max=100&adv_age=3000&server=`;
}

/** `search-result.js:186-193`, one tooltip per `hasNfo` state. */
export function nfoTooltip(hasNfo: HasNfo | undefined): string {
    if (hasNfo === "YES") {
        return "Show NFO";
    }
    if (hasNfo === "MAYBE") {
        return "Try to load NFO (may not be available)";
    }
    return "No NFO available";
}

/**
 * One search result's detail surfaces: the NFO action, and — only for a
 * session that may see details and downloads — the Binsearch, comments, and
 * details links, in legacy's order (`search-result.html:69-107`).
 *
 * Legacy dims an unavailable link with `.no-nfo` (`icons.less:134-137`:
 * `opacity: .25; pointer-events: none`), which is a disabled control drawn by
 * hand. Here each such control is genuinely `disabled`, so it is unreachable
 * by keyboard and announced as disabled rather than only looking faint — the
 * same substitution the download actions already make.
 *
 * Rendered inside the row's existing Actions cell rather than as a ninth
 * column: ADR-0011 forbids horizontal scrolling and lets the Title column
 * absorb the squeeze, and a new column would take its width from Title at
 * every viewport. Below the stacking breakpoint the Actions cell is a card
 * row, so these controls stay reachable there too.
 */
export function ResultDetailLinks({
    dereferer,
    maySeeDetailsDl,
    result,
    transport,
}: {
    dereferer: unknown;
    maySeeDetailsDl: boolean;
    result: SearchResult;
    transport: ApiTransport;
}) {
    // The context rather than `useToasts()`, which throws without a provider:
    // `SearchResults` already renders its rows in that (never reached in the
    // app) configuration, and a missing toast provider must not take the whole
    // results table down with it -- only the toast is then lost.
    const toasts = useContext(ToastContext);
    const [nfo, setNfo] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    // Legacy's `showNfo` is bound on every row regardless of `hasNfo`, and
    // "NO" is only styled away with `.no-nfo`. The state that reaches this
    // component is the parsed enum, so an unknown/absent value is treated as
    // "NO": no request is ever sent for a result the backend says has no NFO.
    const nfoAvailable = result.hasNfo === "YES" || result.hasNfo === "MAYBE";
    const showNfo = async () => {
        if (!nfoAvailable || loading) {
            return;
        }
        setLoading(true);
        try {
            const response = await getNfo(transport, result.searchResultId);
            if (response.successful && response.hasNfo) {
                setNfo(response.content);
            } else if (response.successful) {
                toasts?.showToast({
                    severity: "info",
                    message: "No NFO available",
                });
            } else {
                toasts?.showToast({
                    severity: "error",
                    message: response.content || "Unable to load the NFO.",
                });
            }
        } catch {
            toasts?.showToast({
                severity: "error",
                message: "Unable to load the NFO.",
            });
        } finally {
            setLoading(false);
        }
    };
    const commentsHref = result.comments_link
        ? externalLink(result.comments_link, dereferer)
        : undefined;
    const detailsHref = result.details_link
        ? externalLink(result.details_link, dereferer)
        : undefined;
    return (
        <Stack
            data-testid="result-links"
            direction="row"
            sx={{
                alignItems: "center",
                // ADR-0011: the table never scrolls horizontally, so this
                // cell's content must be able to shrink to a single icon's
                // width -- an unwrappable row of four controls would set a
                // min-content width the fixed `<colgroup>` cannot honor and
                // would push the page itself into horizontal overflow just
                // below the stacking breakpoint.
                flexWrap: "wrap",
                justifyContent: "flex-end",
            }}
        >
            <Tooltip title={nfoTooltip(result.hasNfo)}>
                {/* A disabled control fires no events, so the tooltip needs an
                    enabled wrapper to hang off — MUI's documented pattern for
                    a tooltip on a disabled button. */}
                <span>
                    <IconButton
                        aria-label={`${nfoTooltip(result.hasNfo)}: ${result.title}`}
                        data-testid="result-nfo"
                        disabled={!nfoAvailable || loading}
                        onClick={() => void showNfo()}
                        size="small"
                        // `fuzzy-nfo` (`icons.less:130-132`): a "MAYBE" NFO is
                        // drawn fainter than a certain one. The muted text
                        // role, not a color literal.
                        sx={
                            result.hasNfo === "MAYBE"
                                ? {color: "text.secondary"}
                                : undefined
                        }
                    >
                        <DescriptionOutlinedIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            {maySeeDetailsDl && result.source !== undefined && (
                <DetailLink
                    href={externalLink(binsearchUrl(result.source), dereferer)}
                    label={`Search via Binsearch: ${result.title}`}
                    testId="result-binsearch-link"
                    tooltip="Search via Binsearch"
                >
                    <SearchIcon fontSize="small" />
                </DetailLink>
            )}
            {maySeeDetailsDl && (
                <DetailLink
                    // Legacy dims this one on the comment *count*
                    // (`ng-class="{'no-nfo': !result.comments}"`) while taking
                    // the href from `comments_link`, so a result with a link
                    // but no counted comments was unreachable anyway. Both
                    // conditions disable it here, which is the same outcome
                    // with no dead-but-enabled control in between.
                    href={result.comments ? commentsHref : undefined}
                    label={`Comments: ${result.title}`}
                    testId="result-comments-link"
                    tooltip="Comments"
                >
                    <ChatBubbleOutlineOutlinedIcon fontSize="small" />
                </DetailLink>
            )}
            {maySeeDetailsDl && (
                <DetailLink
                    href={detailsHref}
                    label={`Details: ${result.title}`}
                    testId="result-details-link"
                    tooltip="Details"
                >
                    <InfoOutlinedIcon fontSize="small" />
                </DetailLink>
            )}
            <NfoDialog
                content={nfo}
                onClose={() => setNfo(null)}
                title={result.title}
            />
        </Stack>
    );
}

/**
 * One external result link. Without a usable `href` — the target is missing,
 * or `C-EXTERNAL-LINKS` refused it (a non-`http(s)` target, or a dereferer
 * that produces no valid URL) — the control renders disabled instead of as an
 * anchor pointing nowhere.
 */
function DetailLink({
    children,
    href,
    label,
    testId,
    tooltip,
}: {
    children: ReactNode;
    href: string | undefined;
    label: string;
    testId: string;
    tooltip: string;
}) {
    return (
        <Tooltip title={tooltip}>
            <span>
                <IconButton
                    aria-label={label}
                    component={href ? "a" : "button"}
                    data-testid={testId}
                    disabled={href === undefined}
                    href={href}
                    // `noopener` is the security property legacy's bare
                    // `target="_blank"` never set; `noreferrer` is
                    // deliberately not added, because the dereferer is the
                    // configured way this application controls referrers.
                    rel={href ? "noopener" : undefined}
                    size="small"
                    target={href ? "_blank" : undefined}
                >
                    {children}
                </IconButton>
            </span>
        </Tooltip>
    );
}
