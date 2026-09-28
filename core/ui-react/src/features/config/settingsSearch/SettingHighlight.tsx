import {GlobalStyles} from "@mui/material";

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
export function SettingHighlight({testId}: {testId: string}) {
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
