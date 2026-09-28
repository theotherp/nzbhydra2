import {useMediaQuery} from "@mui/material";
import {useTheme} from "@mui/material/styles";

// The single definition of "which refine-surface branch is live". Exported so
// a consumer's own layout can resolve the same branch this shell renders
// (`SearchResults.tsx`'s FM-041 "Show refine sidebar" display-options entry
// has to read and write whichever of the two mechanisms is mounted) without
// duplicating the breakpoint query string, which could then drift from this
// module's own.
//
// `useTheme()` from `@mui/material/styles` (rather than `useMediaQuery`'s own
// callback form) so the breakpoint still resolves in a component test that
// renders without a `ThemeProvider`, where `@mui/system`'s theme context is
// null.
//
// FM-042 (ADR-0011): eight table columns cannot render legibly at MUI's
// `sm` (600px), and legacy's own measured stacking threshold is 767px
// (`core/ui-src/less/partials/tables.less:91`'s `@media (max-width:
// @screen-xs-max)`, resolved from the compiled `bright.css` to 767px) --
// closer to MUI's `md` (900px) than to `sm`, but neither names it exactly.
// `theme.breakpoints.values` is `theme.ts`'s territory and out of that
// task's scope, so the threshold is expressed as the raw pixel value 768
// passed directly to `theme.breakpoints.down` (which resolves it as a
// literal `@media (max-width:767.95px)`, not a lookup against
// `theme.breakpoints.values`) rather than through a named `sm`/`md` token.
// `SearchResults.tsx`'s own stacked-card breakpoint passes the identical
// raw value to `theme.breakpoints.down`, so the table's stacking branch and
// this hook's drawer branch switch at the same computed width.
export function useCompactRefineSurface(): boolean {
    const theme = useTheme();
    return useMediaQuery(theme.breakpoints.down(768));
}
