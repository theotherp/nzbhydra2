import {describe, expect, it} from "vitest";

import {createHydraTheme, resolveThemeMode} from "./theme";

describe("resolveThemeMode", () => {
    it("should follow the system preference for automatic mode", () => {
        expect(resolveThemeMode("auto", true)).toBe("dark");
        expect(resolveThemeMode("auto", false)).toBe("light");
    });

    it("should preserve the requested explicit mode", () => {
        expect(resolveThemeMode("light", true)).toBe("light");
        expect(resolveThemeMode("dark", false)).toBe("dark");
        expect(resolveThemeMode("dark-dyschromatopsia", false)).toBe("dark");
    });

    it("should provide the dyschromatopsia severity palette", () => {
        const theme = createHydraTheme("dark-dyschromatopsia", false);

        expect(theme.palette.background.default).toBe("#000000");
        expect(theme.palette.error.main).toBe("#b090c8");
        expect(theme.palette.warning.main).toBe("#f0a830");
    });
});
