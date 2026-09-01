/*
 *  (C) Copyright 2026 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {IconButton} from "@mui/material";

import {useToasts} from "./toasts/toasts";

/**
 * `C-COPY-VALUE-BUTTON`: one copy-to-clipboard icon button for a single table
 * cell's underlying value -- `DownloadActions.tsx`'s bulk "Copy selected
 * links" button (`:265-292`) is the app's only prior clipboard path, and no
 * history page had any.
 *
 * Selection rule (the reason a column does or does not get one): offered only
 * on free text or machine-generated identifiers a user pastes elsewhere --
 * a query, an IP, a user agent, a notification body or URL list -- and only
 * where no existing action already yields that value. A short enumerated or
 * already-actionable column (time, category, source, result, age, indexer,
 * type, username) gets none; a button on every cell is the failure mode this
 * rule exists to avoid.
 *
 * Always in the DOM when it renders at all -- visually revealed only on row
 * hover (via the `copy-value-button` class a consumer's row/table styles
 * target) or while focused (`&.Mui-focusVisible` here), so it never hides a
 * tab stop behind a hover state a keyboard user cannot produce.
 *
 * `value` is the cell's *underlying* value, never its rendered or truncated
 * form -- callers pass the raw field (`entry.title`, `entry.ip`, …), not
 * anything read back out of the DOM.
 *
 * Renders nothing at all -- not a disabled control -- when `value` is empty
 * or `navigator.clipboard` is unavailable, which it routinely is: NZBHydra is
 * commonly served over plain HTTP on a LAN, and `navigator.clipboard` is
 * undefined outside a secure context (MDN). A button that always fails to
 * write is worse than no button.
 */
/**
 * The row-hover half of the reveal rule described above (the focus half is
 * authored on the button itself, `&.Mui-focusVisible`). Spread onto a
 * consuming row's own `sx` -- e.g. a `TableRow` -- to reveal every
 * `CopyValueButton` it contains on hover, without a mouse user having to tab
 * to one first. ADR-0014: this is a state toggle (`opacity`), never a colour,
 * so it needs no theme token.
 */
export const rowRevealsCopyButtonsOnHover = {
    "&:hover .copy-value-button": {opacity: 1},
} as const;

export function CopyValueButton({
    label,
    testId,
    value,
}: {
    /** Names the copied value: the accessible name is `Copy ${label}`. */
    label: string;
    testId: string;
    value: string | undefined;
}) {
    const toasts = useToasts();
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
        return null;
    }
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            toasts.showToast({
                severity: "success",
                message: `Copied ${label} to clipboard.`,
            });
        } catch {
            toasts.showToast({
                severity: "error",
                message: `Failed to copy ${label} to clipboard.`,
            });
        }
    };
    return (
        <IconButton
            aria-label={`Copy ${label}`}
            className="copy-value-button"
            data-testid={testId}
            onClick={() => void copy()}
            size="small"
            sx={{
                opacity: 0,
                "&.Mui-focusVisible": {opacity: 1},
            }}
        >
            <ContentCopyIcon fontSize="inherit" />
        </IconButton>
    );
}
