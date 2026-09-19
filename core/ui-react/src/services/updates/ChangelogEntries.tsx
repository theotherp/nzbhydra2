import {Chip, Stack, Typography} from "@mui/material";
import type {Theme} from "@mui/material";

import type {ChangelogChange, ChangelogEntry} from "../../api/system/updates";
import {SafeRichContent} from "../../components/content/SafeRichContent";

/**
 * The changelog list legacy renders identically in `changelog-modal.html` and
 * `version-history.html`: a heading per version and one badged line per change.
 * `change.text` is server-authored HTML and goes through
 * `C-SAFE-RICH-CONTENT`'s `changelog` boundary, never into raw HTML injection.
 */
export function ChangelogEntries({entries}: {entries: ChangelogEntry[]}) {
    return (
        <Stack component="ul" spacing={3} sx={{listStyle: "none", m: 0, p: 0}}>
            {entries.map((entry, index) => (
                <Stack
                    component="li"
                    key={`${entry.version ?? "unknown"}-${index}`}
                    spacing={1}
                >
                    <Typography component="h3" variant="h6">
                        {entry.version}
                        {entry.final ? "" : " Beta"}
                        {entry.date === null ? "" : ` (${entry.date})`}
                    </Typography>
                    {entry.changes.map((change, changeIndex) => (
                        <Stack
                            direction="row"
                            key={changeIndex}
                            spacing={1}
                            sx={{
                                alignItems: "baseline",
                            }}
                        >
                            <ChangeTypeBadge type={change.type} />
                            <SafeRichContent
                                boundary="changelog"
                                html={change.text}
                            />
                        </Stack>
                    ))}
                </Stack>
            ))}
        </Stack>
    );
}

const BADGES: Record<
    string,
    {color: "primary" | "success" | "warning"; label: string}
> = {
    feature: {color: "success", label: "Feature"},
    fix: {color: "warning", label: "Fix"},
    note: {color: "primary", label: "Note"},
};

/**
 * Owner request (2026-09-19): every badge is as wide as the widest label
 * ("Feature"), so the change texts beside them all start at the same x and the
 * list reads as one column instead of three ragged ones. Nine spacing units
 * clear "Feature" at the small chip's 13px type with room to spare; a label
 * that outgrew it would be ellipsized by `Chip` rather than shift its row.
 *
 * As a `theme.spacing` call, not a bare number: `sx`'s `width` is not one of
 * the spacing-scaled properties, so `width: 9` would be nine *pixels* -- which
 * renders three equally wide slivers that satisfy an alignment test perfectly
 * and show no label at all. It is applied through `sx`'s own callback form,
 * because a function as a single property's *value* is not something `sx`
 * resolves -- that silently drops the rule.
 */
const badgeWidth = (theme: Theme) => theme.spacing(9);

/**
 * Legacy's `ng-switch` over `change.type` renders nothing for an unknown type
 * (`version-history.html:8-12`), so an unrecognized value stays unbadged.
 */
function ChangeTypeBadge({type}: {type: ChangelogChange["type"]}) {
    const badge = type === null ? undefined : BADGES[type.toLowerCase()];
    if (badge === undefined) {
        return null;
    }
    return (
        <Chip
            color={badge.color}
            label={badge.label}
            size="small"
            sx={(theme) => ({
                // The badge is a flex item beside the change text, so without
                // this a long text shrinks it below the fixed width -- which
                // is the ragged column this was meant to remove, just with a
                // different cause.
                flexShrink: 0,
                width: badgeWidth(theme),
            })}
        />
    );
}
