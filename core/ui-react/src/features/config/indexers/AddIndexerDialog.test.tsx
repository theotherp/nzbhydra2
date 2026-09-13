import {ThemeProvider} from "@mui/material";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {createHydraTheme} from "../../../app/theme";
import {AddIndexerDialog} from "./AddIndexerDialog";
import {
    CUSTOM_NEWZNAB_PRESET,
    CUSTOM_TORZNAB_PRESET,
    NEWZNAB_PRESETS,
    SPECIAL_PRESETS,
    TORZNAB_PRESETS,
    type IndexerPreset,
} from "./indexerPresets";

const theme = createHydraTheme();

function renderDialog(
    overrides: Partial<{
        onCancel: () => void;
        onImport: (source: "jackett" | "prowlarr") => void;
        onSelect: (preset: IndexerPreset) => void;
    }> = {},
) {
    const onCancel = overrides.onCancel ?? vi.fn();
    const onImport = overrides.onImport ?? vi.fn();
    const onSelect = overrides.onSelect ?? vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <AddIndexerDialog
                onCancel={onCancel}
                onImport={onImport}
                onSelect={onSelect}
            />
        </ThemeProvider>,
    );
    return {onCancel, onImport, onSelect};
}

function filterField(): HTMLElement {
    return screen.getByTestId("config-indexer-preset-filter");
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe("AddIndexerDialog", () => {
    it("renders every preset from the three groups, custom entries first, in array order", () => {
        renderDialog();

        const dialog = screen.getByTestId("config-indexer-add-dialog");
        const presetTestIds = within(dialog)
            .getAllByRole("button")
            .map((button) => button.getAttribute("data-testid"))
            .filter(
                (id): id is string =>
                    id !== null && id.startsWith("config-indexer-preset-"),
            );

        expect(presetTestIds).toEqual([
            `config-indexer-preset-newznab-${CUSTOM_NEWZNAB_PRESET.slug}`,
            ...NEWZNAB_PRESETS.map(
                (preset) => `config-indexer-preset-newznab-${preset.slug}`,
            ),
            `config-indexer-preset-torznab-${CUSTOM_TORZNAB_PRESET.slug}`,
            ...TORZNAB_PRESETS.map(
                (preset) => `config-indexer-preset-torznab-${preset.slug}`,
            ),
            ...SPECIAL_PRESETS.map(
                (preset) => `config-indexer-preset-special-${preset.slug}`,
            ),
        ]);
    });

    it("visually distinguishes the custom blank-entry choices with an icon and emphasis, not colour alone", () => {
        renderDialog();

        const customNewznab = screen.getByTestId(
            `config-indexer-preset-newznab-${CUSTOM_NEWZNAB_PRESET.slug}`,
        );
        expect(customNewznab.querySelector("svg")).not.toBeNull();
        expect(customNewznab.querySelector("em")).not.toBeNull();

        const nzbgeek = screen.getByTestId(
            "config-indexer-preset-newznab-nzbgeek",
        );
        expect(nzbgeek.querySelector("svg")).toBeNull();
        expect(nzbgeek.querySelector("em")).toBeNull();
    });

    it("truncates a long preset label instead of breaking layout", () => {
        renderDialog();

        // "Add custom newznab indexer" is, itself, one of the longer labels
        // in the real preset data -- the truncation styling has to apply
        // generically, not to a hand-picked fixture.
        const label = screen
            .getByTestId(
                `config-indexer-preset-newznab-${CUSTOM_NEWZNAB_PRESET.slug}`,
            )
            .querySelector(".MuiTypography-root");

        expect(label).not.toBeNull();
        expect(label?.className).toContain("MuiTypography-noWrap");
    });

    it("narrows all groups by case-insensitive substring on the label without reordering", () => {
        renderDialog();

        fireEvent.change(filterField(), {target: {value: "GEEK"}});

        const dialog = screen.getByTestId("config-indexer-add-dialog");
        expect(within(dialog).getByText("Usenet")).toBeVisible();
        expect(within(dialog).queryByText("Torrents")).toBeNull();
        expect(within(dialog).queryByText("Special")).toBeNull();
        expect(
            screen.getByTestId("config-indexer-preset-newznab-nzbgeek"),
        ).toBeVisible();
        expect(
            screen.queryByTestId(
                `config-indexer-preset-newznab-${CUSTOM_NEWZNAB_PRESET.slug}`,
            ),
        ).toBeNull();
    });

    it("shows an explicit empty line when the filter matches no preset", () => {
        renderDialog();

        fireEvent.change(filterField(), {
            target: {value: "no such indexer exists"},
        });

        const dialog = screen.getByTestId("config-indexer-add-dialog");
        expect(within(dialog).queryByText("Usenet")).toBeNull();
        expect(within(dialog).queryByText("Torrents")).toBeNull();
        expect(within(dialog).queryByText("Special")).toBeNull();
        expect(
            screen.getByTestId("config-indexer-preset-no-matches"),
        ).toHaveTextContent("No presets match “no such indexer exists”.");
    });

    it("keeps the importers in their own section, hiding one only when the filter also misses its label", () => {
        renderDialog();

        expect(
            screen.getByTestId("config-indexer-import-jackett"),
        ).toBeVisible();
        expect(
            screen.getByTestId("config-indexer-import-prowlarr"),
        ).toBeVisible();

        fireEvent.change(filterField(), {target: {value: "prowlarr"}});

        expect(
            screen.queryByTestId("config-indexer-import-jackett"),
        ).toBeNull();
        expect(
            screen.getByTestId("config-indexer-import-prowlarr"),
        ).toBeVisible();

        // A filter that matches only presets clears both importers, but the
        // "Import" heading itself is not part of the preset groups and stays.
        fireEvent.change(filterField(), {target: {value: "geek"}});
        expect(
            screen.queryByTestId("config-indexer-import-jackett"),
        ).toBeNull();
        expect(
            screen.queryByTestId("config-indexer-import-prowlarr"),
        ).toBeNull();
        expect(screen.getByText("Import")).toBeVisible();
    });

    it("calls onSelect exactly once with the clicked preset and never onImport", () => {
        const {onImport, onSelect} = renderDialog();

        fireEvent.click(
            screen.getByTestId("config-indexer-preset-newznab-nzbgeek"),
        );

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(
            NEWZNAB_PRESETS.find((preset) => preset.slug === "nzbgeek"),
        );
        expect(onImport).not.toHaveBeenCalled();
    });

    it("calls onImport with the clicked source and never onSelect", () => {
        const {onImport, onSelect} = renderDialog();

        fireEvent.click(screen.getByTestId("config-indexer-import-prowlarr"));

        expect(onImport).toHaveBeenCalledTimes(1);
        expect(onImport).toHaveBeenCalledWith("prowlarr");
        expect(onSelect).not.toHaveBeenCalled();
    });

    it("calls onCancel from the Cancel action", () => {
        const {onCancel} = renderDialog();

        fireEvent.click(screen.getByTestId("config-indexer-add-dialog-cancel"));

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("puts every preset and importer on a real <button>, in one Tab order with no reordering by group", () => {
        renderDialog();

        const dialog = screen.getByTestId("config-indexer-add-dialog");
        const buttons = within(dialog).getAllByRole("button");

        // The filter field precedes every preset button, and every preset
        // button precedes the two importers, which precede Cancel -- the
        // gallery relies on native document order for its Tab order rather
        // than any `tabIndex` bookkeeping.
        const testIds = buttons.map((button) =>
            button.getAttribute("data-testid"),
        );
        const firstImport = testIds.indexOf("config-indexer-import-jackett");
        const presetIndices = testIds.reduce<number[]>((indices, id, index) => {
            if (id !== null && id.startsWith("config-indexer-preset-")) {
                indices.push(index);
            }
            return indices;
        }, []);
        const lastPreset = Math.max(...presetIndices);
        const cancelIndex = testIds.indexOf("config-indexer-add-dialog-cancel");
        expect(lastPreset).toBeGreaterThanOrEqual(0);
        expect(lastPreset).toBeLessThan(firstImport);
        expect(firstImport).toBeLessThan(cancelIndex);

        // None of them opts out of the native Tab order.
        for (const button of buttons) {
            expect(button.getAttribute("tabindex")).not.toBe("-1");
        }
    });
});
