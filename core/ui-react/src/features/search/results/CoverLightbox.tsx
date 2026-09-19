import {Box, Dialog} from "@mui/material";
import type {PaperProps} from "@mui/material";

/**
 * FM-196: one result's cover at full size, centred in the viewport over a
 * backdrop — legacy's enlarge-on-click (`search-result.js:275-292`, a
 * `$uibModal` whose body was `text-align: center` around
 * `<img ng-click="$close()">`, `keyboard: true`), which FM-177 left unmigrated
 * and FM-179 replaced with a hover preview beside the row. The preview is
 * still there; this is the surface a *click* opens, and it closes on the next
 * click anywhere — image or backdrop — exactly as the legacy modal did.
 *
 * A feature-owned MUI `Dialog` rather than `C-DIALOG-SERVICE.confirm`, which
 * models a message-and-details confirmation with its own title and buttons and
 * cannot be reduced to a bare image — the same reasoning, and the same
 * precedent, as `NfoDialog.tsx` beside it.
 *
 * **ADR-0014 deviation, justified here.** The paper is stripped of its
 * surface: no background, no shadow, no radius, no margin, no padding, and no
 * `maxWidth` clamp (MUI's default `maxWidth="sm"` would cap a poster at 600px,
 * which is the one thing an enlarge must not do). That is not restyling a
 * component's internals for taste — the image *is* the surface here, as it was
 * in legacy, whose `.cover-modal-dialog .modal-dialog {width: min-content}`
 * (`less/partials/modals.less:13`) shrank the modal onto the image for the
 * same reason. No colour literal is introduced: `transparent` removes a
 * colour rather than choosing one, and the backdrop behind it is MUI's own,
 * untouched.
 *
 * Unlike the hover preview this image is *not* capped at `searching.coverSize`
 * (ADR-0054): that cap is what makes the tile a thumbnail, and an enlarge that
 * honoured it would show the same pixels again. It is bounded by the viewport
 * instead (90vw/90vh) and never scaled past its natural size, so a small cover
 * stays small rather than being blown up into artefacts.
 *
 * MUI's scroll lock stays on: this dialog is modal and opens on a deliberate
 * click, so the page behind it must not scroll away under the backdrop. Only
 * the hover popover disables it — a surface that opens as a cursor crosses a
 * thumbnail cannot be allowed to reflow the page.
 */
export function CoverLightbox({
    onClose,
    onExited,
    open,
    src,
    title,
}: {
    onClose: () => void;
    /**
     * Called once the dialog has finished its exit transition and left both
     * the DOM and MUI's `ModalManager` -- see the caller, which holds the
     * hover preview back until then.
     */
    onExited: () => void;
    open: boolean;
    /** The same URL the row's `search-result-cover` thumbnail carries. */
    src: string;
    /** The result's title, so the dialog says which cover it shows. */
    title: string;
}) {
    return (
        <Dialog
            onClose={onClose}
            onTransitionExited={onExited}
            open={open}
            slotProps={{
                // The name and the testid go on the *paper*, which is the
                // element MUI gives `role="dialog"` and `aria-modal` to, so
                // the named dialog and the tested element are one and the
                // same rather than two nested divs. The assertion is only
                // about `data-*`: React's prop types special-case those in
                // JSX but not in a props object, so `PaperProps` has no
                // member for one.
                paper: {
                    "aria-label": `Cover for ${title}`,
                    "data-testid": "search-result-cover-lightbox",
                    sx: {
                        backgroundColor: "transparent",
                        borderRadius: 0,
                        boxShadow: "none",
                        margin: 0,
                        maxWidth: "none",
                        padding: 0,
                    },
                } as PaperProps,
            }}
        >
            <Box
                // `alt=""`: the dialog carries the name ("Cover for ..."), and
                // a second copy of the title on the image inside it would be
                // announced twice.
                alt=""
                component="img"
                data-testid="search-result-cover-lightbox-image"
                onClick={onClose}
                src={src}
                sx={{
                    display: "block",
                    height: "auto",
                    maxHeight: "90vh",
                    maxWidth: "90vw",
                    // Only load-bearing once a constraint bites: with both
                    // dimensions auto the image keeps its own ratio, and this
                    // keeps it doing so when the viewport clamps one side.
                    objectFit: "contain",
                    width: "auto",
                }}
            />
        </Dialog>
    );
}
