import {Chip, Stack, Typography} from "@mui/material";

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
                            alignItems="baseline"
                            direction="row"
                            key={changeIndex}
                            spacing={1}
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
 * Legacy's `ng-switch` over `change.type` renders nothing for an unknown type
 * (`version-history.html:8-12`), so an unrecognized value stays unbadged.
 */
function ChangeTypeBadge({type}: {type: ChangelogChange["type"]}) {
    const badge = type === null ? undefined : BADGES[type.toLowerCase()];
    if (badge === undefined) {
        return null;
    }
    return <Chip color={badge.color} label={badge.label} size="small" />;
}
