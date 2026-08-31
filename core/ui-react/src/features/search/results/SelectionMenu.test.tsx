import {ThemeProvider} from "@mui/material";
import {render} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {createHydraTheme} from "../../../app/theme";
import {SelectionMenu} from "./SelectionMenu";

// FM-154 moved the unchecked select-all square's border onto the per-theme
// `surfaces.selectAllOutline` token, reached by MUI palette path
// (`borderColor: "surfaces.selectAllOutline"`). A typo in that string would
// not throw -- MUI passes unknown palette paths through, so the border
// silently degrades to `currentColor` and only a screenshot would catch it.
// This pins that the rendered border is the token's own value.
describe("the select-all square's token consumption", () => {
    it("should draw the unchecked border in surfaces.selectAllOutline", () => {
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
        const square = container.querySelector(
            ".MuiCheckbox-root .MuiBox-root",
        );
        expect(square).not.toBeNull();
        const borderColor = getComputedStyle(square as Element).borderColor;
        expect(borderColor).toBe(theme.palette.surfaces.selectAllOutline);
        // Guard the guard: the token must differ from the inherited text
        // color, or a `currentColor` fallback would satisfy the assertion
        // above by coincidence.
        expect(theme.palette.surfaces.selectAllOutline).not.toBe(
            getComputedStyle(square as Element).color,
        );
    });
});
