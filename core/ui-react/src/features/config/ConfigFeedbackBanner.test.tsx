import {ThemeProvider} from "@mui/material";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {createHydraTheme} from "../../app/theme";
import {ConfigFeedbackBanner} from "./ConfigFeedbackBanner";
import type {SettingsIndexEntry} from "./settingsSearch/settingsIndex";

afterEach(cleanup);

function renderBanner(
    props: Partial<Parameters<typeof ConfigFeedbackBanner>[0]> = {},
) {
    const onSelectField = vi.fn<(entry: SettingsIndexEntry) => void>();
    render(
        <ThemeProvider theme={createHydraTheme("dark")}>
            <ConfigFeedbackBanner
                errorMessages={[]}
                onDismissErrors={vi.fn()}
                onDismissWarnings={vi.fn()}
                onSelectField={onSelectField}
                warningMessages={[]}
                {...props}
            />
        </ThemeProvider>,
    );
    return {onSelectField};
}

describe("ConfigFeedbackBanner", () => {
    it("should render nothing when there is nothing to report", () => {
        renderBanner();

        expect(screen.queryByTestId("config-validation-errors")).toBeNull();
        expect(screen.queryByTestId("config-validation-warnings")).toBeNull();
    });

    it("should render every server message verbatim, as text and not as markup", () => {
        // The server sends flat strings by contract (`API-CONFIG-PUT`), and
        // one of them can well contain a value an admin typed. It has to reach
        // the screen whole and inert.
        const message =
            "Indexer <b>Nzbgeek</b> & co: URL http://x/?a=1&b=2 is not reachable";
        renderBanner({
            errorMessages: [message, "The API key must not be empty"],
        });

        const banner = screen.getByTestId("config-validation-errors");
        expect(within(banner).getByText(message)).toBeVisible();
        expect(within(banner).queryByRole("strong")).toBeNull();
        expect(banner.innerHTML).not.toContain("<b>");
        expect(banner).toHaveTextContent("The API key must not be empty");
    });

    it("should keep two identical server messages instead of collapsing them", () => {
        renderBanner({errorMessages: ["Not reachable", "Not reachable"]});

        expect(
            within(screen.getByTestId("config-validation-errors")).getAllByText(
                "Not reachable",
            ),
        ).toHaveLength(2);
    });

    it("should tell the two reports apart by more than their colour", () => {
        renderBanner({
            errorMessages: ["Port must be a number"],
            warningMessages: ["No indexer configured"],
        });

        const errors = screen.getByTestId("config-validation-errors");
        const warnings = screen.getByTestId("config-validation-warnings");
        expect(errors).toHaveTextContent("Config validation failed");
        expect(errors).toHaveTextContent("They need to be fixed.");
        expect(warnings).toHaveTextContent("Config validation warnings");
        expect(warnings).toHaveTextContent("The config was already saved.");
        // MUI's own severity icons: two different glyphs, not two hues.
        const errorIcon = errors.querySelector("svg");
        const warningIcon = warnings.querySelector("svg");
        expect(errorIcon).not.toBeNull();
        expect(warningIcon).not.toBeNull();
        expect(errorIcon?.innerHTML).not.toBe(warningIcon?.innerHTML);
    });

    it("should name a setting by its index label and its tab, and report a click on it", () => {
        const {onSelectField} = renderBanner({
            invalidErrors: {
                searching: {
                    coverSize: {
                        message: "Must be at least 1",
                        type: "validate",
                    },
                },
            },
        });

        const entry = screen.getByTestId(
            "config-invalid-field-searching-coverSize",
        );
        expect(entry).toHaveTextContent(
            "Searching › Cover width: Must be at least 1",
        );
        fireEvent.click(entry);

        expect(onSelectField).toHaveBeenCalledTimes(1);
        expect(onSelectField.mock.calls[0][0].path).toBe("searching.coverSize");
    });

    it("should list the settings the way the nav orders their tabs", () => {
        renderBanner({
            invalidErrors: {
                searching: {coverSize: {message: "Bad", type: "validate"}},
                main: {host: {message: "Bad", type: "validate"}},
            },
        });

        expect(
            within(screen.getByTestId("config-validation-errors"))
                .getAllByTestId(/^config-invalid-field-/)
                .map((entry) => entry.dataset.testid),
        ).toEqual([
            "config-invalid-field-main-host",
            "config-invalid-field-searching-coverSize",
        ]);
    });

    it("should point a field inside a list entry at the list that holds it", () => {
        // A per-entry field has no row of its own in the index, so it is named
        // by its raw path — but it can still be navigated to, via the section
        // the index does hold. The untouched indices of the per-entry error
        // array are present and `undefined`, as React Hook Form leaves them.
        const {onSelectField} = renderBanner({
            invalidErrors: {
                indexers: [
                    undefined,
                    {
                        name: {
                            message: "This field is required",
                            type: "required",
                        },
                    },
                ],
            },
        });

        const entry = screen.getByTestId(
            "config-invalid-field-indexers-1-name",
        );
        expect(entry).toHaveTextContent(
            "Indexers › indexers.1.name: This field is required",
        );
        fireEvent.click(entry);
        expect(onSelectField.mock.calls[0][0].path).toBe("indexers");
    });

    it("should report an array-level error against the array itself", () => {
        // `root` is React Hook Form's bookkeeping name, not a setting.
        renderBanner({
            invalidErrors: {
                indexers: {
                    root: {message: "At least one indexer", type: "min"},
                },
            },
        });

        expect(
            screen.getByTestId("config-invalid-field-indexers"),
        ).toHaveTextContent("Indexers › Indexers: At least one indexer");
    });

    it("should survive an error object with no message of its own", () => {
        renderBanner({
            invalidErrors: {
                main: {host: {ref: {name: "main.host"}, type: "validate"}},
            },
        });

        expect(
            screen.getByTestId("config-invalid-field-main-host"),
        ).toHaveTextContent("Main › Host: This setting is invalid.");
    });

    it("should still report a field it cannot navigate to, without a link", () => {
        renderBanner({
            invalidErrors: {
                emby: {host: {message: "Not reachable", type: "validate"}},
            },
        });

        const entry = screen.getByTestId("config-invalid-field-emby-host");
        // No tab models `emby`, so there is nowhere honest to send the admin;
        // the reason the save was refused is still reported.
        expect(entry).toHaveTextContent("emby.host: Not reachable");
        expect(within(entry).queryByRole("button")).toBeNull();
    });

    it("should report nothing from an empty error tree", () => {
        renderBanner({invalidErrors: {}});

        expect(screen.queryByTestId("config-validation-errors")).toBeNull();
    });
});
