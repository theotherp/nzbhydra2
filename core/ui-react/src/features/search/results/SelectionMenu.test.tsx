import {ThemeProvider} from "@mui/material";
import {render} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {createHydraTheme} from "../../../app/theme";
import {SelectionMenu} from "./SelectionMenu";

// FM-154 moved the unchecked select-all square's border onto the per-theme
// `surfaces.selectAllOutline` token. A typo in the palette path would not
// throw, so the border would silently degrade and only a screenshot would
// catch it. This pins that the rendered border is the token's own value.
//
// FM-184 (ADR-0056): the square is an `SvgIcon` rather than a `Box` now --
// MUI 9.4's `Checkbox.js` rings `&.Mui-focusVisible svg:first-of-type`, so a
// non-`svg` icon would leave this control with no focus indicator at all --
// and the border is the `rect`'s `stroke`. The presence of a real `svg` is
// asserted here too, because that is the property the focus ring depends on.
describe("the select-all square's token consumption", () => {
    it("should draw the unchecked border in surfaces.selectAllOutline on an svg icon", () => {
        const theme = createHydraTheme("grey");
        const {container} = render(
            <ThemeProvider theme={theme}>
                <SelectionMenu
                    idPrefix="header"
                    onDeselectAll={vi.fn()}
                    onInvertSelection={vi.fn()}
                    onSelectAll={vi.fn()}
                    status="none"
                />
            </ThemeProvider>,
        );
        // MUI's own rule is keyed to `svg:first-of-type` under the focused
        // root, so this is the selector the focus ring itself resolves.
        const icon = container.querySelector(
            ".MuiCheckbox-root svg:first-of-type",
        );
        expect(icon).not.toBeNull();
        const square = icon?.querySelector("rect");
        expect(square).not.toBeNull();
        // The border is the rect's `currentColor` stroke, and `currentColor`
        // is the token the icon's own `color` resolves the palette path to.
        expect(square?.getAttribute("stroke")).toBe("currentColor");
        expect(getComputedStyle(icon as Element).color).toBe(
            theme.palette.surfaces.selectAllOutline,
        );
        // Guard the guard: the token must differ from the colour the icon
        // would inherit if the palette path resolved to nothing, or the
        // assertion above would pass by coincidence.
        expect(theme.palette.surfaces.selectAllOutline).not.toBe(
            getComputedStyle(document.body).color,
        );
    });
});
