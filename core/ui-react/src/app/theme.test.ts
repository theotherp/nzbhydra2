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
        expect(theme.palette.background.paper).toBe("#0f1113");
        expect(theme.palette.error.main).toBe("#b090c8");
        expect(theme.palette.info.main).toBe("#3aaccf");
        expect(theme.palette.primary.main).toBe("#78909c");
        expect(theme.palette.success.main).toBe("#30b885");
        expect(theme.palette.warning.main).toBe("#f0a830");
    });

    it("should default palette.mode to dark when no preference is supplied", () => {
        const theme = createHydraTheme();

        expect(theme.palette.mode).toBe("dark");
    });
});

describe("createHydraTheme base palette", () => {
    it("should source the base palette from legacy's grey theme, with the logo-green primary variance", () => {
        const theme = createHydraTheme("dark", false);

        expect(theme.palette.background.default).toBe("#262c2e");
        expect(theme.palette.background.paper).toBe("#2d3436");
        expect(theme.palette.text.primary).toBe("#c8c8c8");
        expect(theme.palette.text.secondary).toBe("#7a8288");
        expect(theme.palette.success.main).toBe("#42b142");
        expect(theme.palette.info.main).toBe("#398da5");
        expect(theme.palette.warning.main).toBe("#a96405");
        expect(theme.palette.error.main).toBe("#a33938");
        expect(theme.palette.primary.main).toBe("#0fab4b");
    });

    it("should apply the base palette regardless of light/dark mode", () => {
        const theme = createHydraTheme("light", false);

        expect(theme.palette.mode).toBe("light");
        expect(theme.palette.primary.main).toBe("#0fab4b");
        expect(theme.palette.background.default).toBe("#262c2e");
    });
});
