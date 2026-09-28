import type {RefineSurfaceLabels} from "../../../components/refine/RefineSurface";

// The results page's own chrome vocabulary for ADR-0046's shared refine
// surface. Both objects are compatibility contracts of this feature, not of
// the shell: `refine-sidebar`, `-toggle`, `-drawer`, `-close` and
// `refine-clear-all` are the ids `SearchResults.test.tsx` and
// `tests/system/tests/results.spec.ts` have always queried, and the accessible
// names are the ones this page's controls have always announced.
//
// FM-181 exports the labels because the compact branch's trigger is no longer
// the shell's own: below 768px `SearchResults.tsx` renders
// `refine-sidebar-toggle` itself, inside the single sticky toolbar row, and it
// has to announce the same two names the docked column's toggle does.
export const REFINE_LABELS: Omit<RefineSurfaceLabels, "done"> = {
    close: "Close refine sidebar",
    collapse: "Collapse refine sidebar",
    expand: "Expand refine sidebar",
    // FM-142: the below-768px trigger's visible text only. The docked column
    // renders no caption of its own any more.
    heading: "Refine",
    surface: "Refine results",
};
