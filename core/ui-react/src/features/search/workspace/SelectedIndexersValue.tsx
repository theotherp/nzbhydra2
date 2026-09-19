import {Box} from "@mui/material";
import {useLayoutEffect, useRef, useState} from "react";

/**
 * What the indexer select shows for its selection: the indexers by name while
 * they fit on one line, and "3/10 selected" when they do not.
 *
 * Owner defect (2026-09-19): MUI's default joins every selected name, and the
 * section around the field was a flex item at its `min-width: auto`, so the
 * *field* grew to fit that text instead of the text having to fit the field.
 * On a phone with ten indexers it ran far past the viewport, taking its
 * dropdown arrow -- the only part of a `Select` that looks pressable -- off
 * screen with it. `SearchWorkspace` clamps the section (`minWidth: 0`); this
 * decides what the clamped field can say.
 *
 * The names are always laid out, in a hidden copy that never wraps; the
 * visible content is chosen by comparing that copy's width with the space the
 * field actually has. Measuring the copy rather than the visible text is what
 * keeps the decision stable: the summary is short, so a naive "does the
 * visible text overflow" test would swap back to the names and oscillate.
 * For that to hold, the container must take its width from the field and not
 * from whichever branch is showing -- see `width: "100%"` below, without which
 * the count stuck once it had appeared.
 *
 * `useLayoutEffect` rather than `useEffect`, like every other measurement here
 * that feeds rendered output (`ConfigNav`, `UpdateFooterBanners`,
 * `SearchResults`): a session that restored Advanced as open would otherwise
 * get one painted frame of the long names, which on a phone is one frame of
 * the very overflow this removes. The guarded `ResizeObserver` is the same
 * idiom; jsdom lays nothing out, so every width there is 0 and the names stay,
 * which is what the unit test asserts against. The real geometry is
 * system-test territory.
 */
export function SelectedIndexersValue({
    names,
    total,
}: {
    names: string[];
    total: number;
}) {
    const containerRef = useRef<HTMLSpanElement | null>(null);
    const measureRef = useRef<HTMLSpanElement | null>(null);
    const [fits, setFits] = useState(true);
    const joined = names.join(", ");

    useLayoutEffect(() => {
        const container = containerRef.current;
        const measure = measureRef.current;
        if (container === null || measure === null) {
            return undefined;
        }
        const check = () => {
            const available = container.clientWidth;
            setFits(available === 0 || measure.scrollWidth <= available);
        };
        check();
        // A webfont that swaps in after this first measurement changes the
        // text's width without resizing anything, so the observer below would
        // never hear about it and a borderline selection would stay on the
        // wrong branch until the next real resize.
        void document.fonts?.ready.then(check).catch(() => undefined);
        if (typeof ResizeObserver === "undefined") {
            return undefined;
        }
        const observer = new ResizeObserver(check);
        observer.observe(container);
        return () => observer.disconnect();
    }, [joined]);

    return (
        <Box
            component="span"
            data-testid="workspace-indexers-value"
            ref={containerRef}
            sx={{
                display: "block",
                // The clip lives here rather than on `.MuiSelect-select`, so
                // MUI's own `text-overflow` no longer reaches the text that is
                // actually clipped -- `text-overflow` does not inherit. Both
                // are repeated for the measurement's own margin of error: a
                // name list cut mid-glyph is what the stock field would never
                // have shown. Note that this clip also means overflow inside
                // the value can no longer widen the combobox's `scrollWidth`,
                // which is what `search.spec.ts`'s `expectVisualGeometry`
                // watches -- that check can no longer fail for this field.
                overflow: "hidden",
                position: "relative",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                // Without this the span is sized by its own content inside
                // MUI's flex select, so the moment the summary replaced the
                // names the container shrank to the summary's width and the
                // names could never be found to fit again -- widening the
                // window left the count standing. Observed in the browser;
                // jsdom measures everything as 0 and cannot show it.
                width: "100%",
            }}
        >
            {fits ? joined : `${names.length}/${total} selected`}
            <Box
                aria-hidden
                component="span"
                ref={measureRef}
                sx={{
                    left: 0,
                    pointerEvents: "none",
                    position: "absolute",
                    top: 0,
                    visibility: "hidden",
                    whiteSpace: "nowrap",
                }}
            >
                {joined}
            </Box>
        </Box>
    );
}
