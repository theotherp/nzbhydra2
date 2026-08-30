import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {useEffect, useState} from "react";
import {
    FormProvider,
    useForm,
    useWatch,
    type UseFormReturn,
} from "react-hook-form";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {SafeConfigContext} from "../../../bootstrap";
import {ShowAdvancedContext} from "../advancedFields";
import {FieldsetNavContext, type FieldsetNavRegistry} from "../fieldsetNav";
import {ApiKeySetting} from "./ApiKeySetting";
import {generateApiKey} from "./apiKey";
import {ChipsSetting} from "./ChipsSetting";
import {ConfigFieldset} from "./ConfigFieldset";
import {FileBrowserSetting} from "./FileBrowserSetting";
import {MultiSelectSetting} from "./MultiSelectSetting";
import {NumberSetting} from "./NumberSetting";
import {SecretInput, UNCHANGED_SECRET_MARKER} from "./SecretInput";
import {SelectSetting} from "./SelectSetting";
import {SwitchSetting} from "./SwitchSetting";
import {TextSetting} from "./TextSetting";
import {patternValidator} from "./settings";

type Harness = {
    form: UseFormReturn<ConfigValues>;
};

function renderSetting(
    ui: React.ReactNode,
    {
        dereferer,
        fieldsetNavRegistry,
        showAdvanced = false,
        values = {},
    }: {
        dereferer?: string;
        /** FM-102: defaults to the inert registry every other test relies on. */
        fieldsetNavRegistry?: FieldsetNavRegistry;
        showAdvanced?: boolean;
        values?: ConfigValues;
    } = {},
): Harness {
    const harness = {} as Harness;
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    function Host() {
        const form = useForm<ConfigValues>({
            defaultValues: values,
            shouldUnregister: false,
        });
        // Handing the form out during render would mutate a value React
        // considers immutable there (`react-hooks/immutability`); the effect
        // has already run by the time `render` returns.
        useEffect(() => {
            harness.form = form;
        }, [form]);
        const body = (
            <ShowAdvancedContext.Provider value={showAdvanced}>
                {ui}
            </ShowAdvancedContext.Provider>
        );
        return (
            <ThemeProvider theme={createHydraTheme("dark")}>
                <QueryClientProvider client={queryClient}>
                    <SafeConfigContext.Provider
                        value={dereferer === undefined ? null : {dereferer}}
                    >
                        <FormProvider {...form}>
                            {fieldsetNavRegistry === undefined ? (
                                body
                            ) : (
                                <FieldsetNavContext.Provider
                                    value={fieldsetNavRegistry}
                                >
                                    {body}
                                </FieldsetNavContext.Provider>
                            )}
                        </FormProvider>
                    </SafeConfigContext.Provider>
                </QueryClientProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("C-CONFIG-FIELDS control kinds", () => {
    it("should edit a text setting through the form and never hold its own copy", () => {
        const harness = renderSetting(
            <TextSetting label="Host" name="main.host" />,
            {values: {main: {host: "0.0.0.0"}}},
        );

        const input = screen.getByTestId("config-input-main-host");
        expect(input).toHaveValue("0.0.0.0");

        fireEvent.change(input, {target: {value: "192.168.0.5"}});
        expect(harness.form.getValues().main).toEqual({host: "192.168.0.5"});

        // The control renders the form, not a copy of it: a value set on the
        // form from the outside appears without the control being touched.
        act(() => {
            harness.form.setValue("main.host", "10.0.0.1");
        });
        expect(input).toHaveValue("10.0.0.1");
    });

    it("should write a number setting back as a number and an emptied one as null", () => {
        const harness = renderSetting(
            <NumberSetting label="Port" name="main.port" unit="ms" />,
            {values: {main: {port: 5076}}},
        );

        const input = screen.getByTestId("config-input-main-port");
        expect(input).toHaveValue(5076);
        expect(screen.getByText("ms")).toBeVisible();

        fireEvent.change(input, {target: {value: "5080"}});
        expect(harness.form.getValues().main).toEqual({port: 5080});

        fireEvent.change(input, {target: {value: ""}});
        expect(harness.form.getValues().main).toEqual({port: null});
    });

    it("should toggle a switch setting", () => {
        const harness = renderSetting(
            <SwitchSetting label="Use SSL" name="main.ssl" />,
            {values: {main: {ssl: false}}},
        );

        fireEvent.click(screen.getByRole("switch", {name: "Use SSL"}));
        expect(harness.form.getValues().main).toEqual({ssl: true});
    });

    it("should choose an option in a select setting", async () => {
        const harness = renderSetting(
            <SelectSetting
                label="Theme"
                name="main.theme"
                options={[
                    {label: "Grey", value: "grey"},
                    {label: "Bright", value: "bright"},
                ]}
            />,
            {values: {main: {theme: "grey"}}},
        );

        fireEvent.mouseDown(screen.getByRole("combobox", {name: "Theme"}));
        fireEvent.click(await screen.findByRole("option", {name: "Bright"}));
        await waitFor(() =>
            expect(harness.form.getValues().main).toEqual({theme: "bright"}),
        );
    });

    it("should select and deselect entries of a multiselect setting", async () => {
        const harness = renderSetting(
            <MultiSelectSetting
                label="Log markers"
                name="main.logging.markersToLog"
                options={[
                    {label: "HTTP", value: "HTTP"},
                    {label: "Performance", value: "PERFORMANCE"},
                ]}
            />,
            {values: {main: {logging: {markersToLog: []}}}},
        );

        // Legacy's closed-state text while nothing is selected.
        expect(
            screen.getByRole("combobox", {name: "Log markers"}),
        ).toHaveTextContent("None");

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Log markers"}),
        );
        fireEvent.click(await screen.findByRole("option", {name: "HTTP"}));
        await waitFor(() =>
            expect(harness.form.getValues().main).toEqual({
                logging: {markersToLog: ["HTTP"]},
            }),
        );
    });

    it("should add and remove chips", async () => {
        const harness = renderSetting(
            <ChipsSetting
                label="Disable SNI"
                name="main.sniDisabledFor"
                placeholder="host"
            />,
            {values: {main: {sniDisabledFor: ["existing.example"]}}},
        );

        expect(screen.getByText("existing.example")).toBeVisible();

        const input = screen.getByTestId("config-input-main-sniDisabledFor");
        fireEvent.change(input, {target: {value: "added.example"}});
        fireEvent.keyDown(input, {key: "Enter"});
        await waitFor(() =>
            expect(harness.form.getValues().main).toEqual({
                sniDisabledFor: ["existing.example", "added.example"],
            }),
        );

        // Backspace on an empty input removes the last chip — MUI
        // Autocomplete's own affordance, alongside each chip's delete icon.
        fireEvent.keyDown(input, {key: "Backspace"});
        await waitFor(() =>
            expect(harness.form.getValues().main).toEqual({
                sniDisabledFor: ["existing.example"],
            }),
        );
    });

    /**
     * FM-107's per-chip validator, in its *absent* state -- which is the state
     * of all five other `ChipsSetting` consumers. Nothing about the control may
     * change for them: an entry no validator would like is still accepted, no
     * error node appears, and `aria-describedby` still names the help text
     * alone (it was a hardcoded `hasError: false` before the property existed).
     */
    it("should accept any chip and describe itself by help alone with no validator", () => {
        const harness = renderSetting(
            <ChipsSetting
                help="Hosts to disable SNI for"
                label="Disable SNI"
                name="main.sniDisabledFor"
            />,
            {values: {main: {sniDisabledFor: []}}},
        );

        const input = screen.getByTestId("config-input-main-sniDisabledFor");
        fireEvent.change(input, {target: {value: "not a number at all"}});
        fireEvent.keyDown(input, {key: "Enter"});

        expect(harness.form.getValues().main).toEqual({
            sniDisabledFor: ["not a number at all"],
        });
        expect(
            screen.queryByTestId("config-error-main-sniDisabledFor"),
        ).toBeNull();
        expect(
            input
                .closest("[aria-describedby]")
                ?.getAttribute("aria-describedby"),
        ).toBe("config-help-main-sniDisabledFor");
    });

    /**
     * The same control with the property present: the entry is refused rather
     * than written, the message is the validator's own, and only now does the
     * error id join `aria-describedby`.
     */
    it("should refuse a chip its validator rejects and describe the refusal", () => {
        const harness = renderSetting(
            <ChipsSetting
                help="Hosts to disable SNI for"
                label="Disable SNI"
                name="main.sniDisabledFor"
                validateChip={(value) =>
                    /^\d+$/.test(String(value))
                        ? true
                        : `"${String(value)}" is not a number`
                }
            />,
            {values: {main: {sniDisabledFor: ["1"]}}},
        );

        const input = screen.getByTestId("config-input-main-sniDisabledFor");
        fireEvent.change(input, {target: {value: "nope"}});
        fireEvent.keyDown(input, {key: "Enter"});

        expect(harness.form.getValues().main).toEqual({sniDisabledFor: ["1"]});
        expect(
            screen.getByTestId("config-error-main-sniDisabledFor"),
        ).toHaveTextContent('"nope" is not a number');
        expect(
            input
                .closest("[aria-describedby]")
                ?.getAttribute("aria-describedby"),
        ).toBe(
            "config-help-main-sniDisabledFor config-error-main-sniDisabledFor",
        );

        // A later acceptable entry clears the refusal and is written.
        fireEvent.change(input, {target: {value: "2"}});
        fireEvent.keyDown(input, {key: "Enter"});
        expect(harness.form.getValues().main).toEqual({
            sniDisabledFor: ["1", "2"],
        });
        expect(
            screen.queryByTestId("config-error-main-sniDisabledFor"),
        ).toBeNull();
    });

    it("should generate a 24-character alphanumeric API key and dirty the form", () => {
        const harness = renderSetting(
            <ApiKeySetting label="API key" name="main.apiKey" />,
            {values: {main: {apiKey: "old"}}},
        );
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(
            screen.getByTestId("config-apikey-generate-main-apiKey"),
        );

        const generated = harness.form.getValues().main as {apiKey: string};
        expect(generated.apiKey).toMatch(/^[0-9a-zA-Z]{24}$/);
        expect(harness.form.formState.isDirty).toBe(true);
    });

    it("should generate distinct keys", () => {
        expect(generateApiKey()).not.toBe(generateApiKey());
    });
});

describe("C-CONFIG-FIELDS row anatomy", () => {
    it("should render help below the control and route its links through the dereferer", () => {
        renderSetting(
            <TextSetting
                help={[
                    "See ",
                    {href: "https://example.test/wiki", text: "wiki"},
                    ".",
                ]}
                label="Host"
                name="main.host"
            />,
            {dereferer: "https://deref.test/?url=$s"},
        );

        const link = screen.getByRole("link", {name: "wiki"});
        expect(link).toHaveAttribute(
            "href",
            "https://deref.test/?url=https%3A%2F%2Fexample.test%2Fwiki",
        );
        expect(
            screen.getByTestId("config-setting-main-host"),
        ).toHaveTextContent("See wiki.");
    });

    it("should offer the tooltip as a focusable button", async () => {
        renderSetting(
            <TextSetting
                label="URL base"
                name="main.urlBase"
                tooltip="Set this behind a reverse proxy"
            />,
        );

        // A real, keyboard-reachable button, not a bare icon with a title.
        const affordance = screen.getByRole("button", {name: "About URL base"});
        affordance.focus();
        expect(affordance).toHaveFocus();
        fireEvent.mouseOver(affordance);
        expect(await screen.findByRole("tooltip")).toHaveTextContent(
            "Set this behind a reverse proxy",
        );
    });

    it("should associate a text setting's help and error text with the control via aria-describedby", async () => {
        const harness = renderSetting(
            <TextSetting
                help="Legacy help text"
                label="Host"
                name="main.host"
                required
            />,
        );

        const input = screen.getByTestId("config-input-main-host");
        // Before any error exists, only the help text describes the field.
        expect(input.getAttribute("aria-describedby")).toBe(
            "config-help-main-host",
        );
        expect(
            document.getElementById("config-help-main-host"),
        ).toHaveTextContent("Legacy help text");

        fireEvent.change(input, {target: {value: ""}});
        expect(await harness.form.trigger()).toBe(false);
        await screen.findByTestId("config-error-main-host");

        // Once an error appears, the control describes itself by both.
        expect(input.getAttribute("aria-describedby")).toBe(
            "config-help-main-host config-error-main-host",
        );
        expect(
            document.getElementById("config-error-main-host"),
        ).toHaveTextContent("This field is required");
    });

    it("should associate a switch setting's help text with its native input via aria-describedby", () => {
        renderSetting(
            <SwitchSetting
                help="Legacy help text"
                label="Use SSL"
                name="main.ssl"
            />,
        );

        expect(
            screen
                .getByRole("switch", {name: "Use SSL"})
                .getAttribute("aria-describedby"),
        ).toBe("config-help-main-ssl");
    });

    it("should associate a select setting's help text with its combobox via aria-describedby", () => {
        renderSetting(
            <SelectSetting
                help="Legacy help text"
                label="Theme"
                name="main.theme"
                options={[{label: "Grey", value: "grey"}]}
            />,
        );

        expect(
            screen
                .getByRole("combobox", {name: "Theme"})
                .getAttribute("aria-describedby"),
        ).toBe("config-help-main-theme");
    });

    it("should hide advanced rows and fieldsets without touching their values", () => {
        const values = {main: {dereferer: "https://deref.test/?url=$s"}};
        const advancedRow = (
            <ConfigFieldset advanced label="Security">
                <TextSetting advanced label="Dereferer" name="main.dereferer" />
            </ConfigFieldset>
        );

        const hidden = renderSetting(advancedRow, {values});
        // FM-098: an advanced fieldset offers itself by name, but neither the
        // fieldset nor anything in it is rendered until that offer is taken up.
        expect(screen.queryByTestId("config-fieldset-security")).toBeNull();
        expect(
            screen.queryByTestId("config-setting-main-dereferer"),
        ).toBeNull();
        expect(hidden.form.getValues()).toEqual(values);

        cleanup();
        renderSetting(advancedRow, {showAdvanced: true, values});
        expect(screen.getByTestId("config-fieldset-security")).toBeVisible();
        expect(screen.getByTestId("config-input-main-dereferer")).toHaveValue(
            "https://deref.test/?url=$s",
        );
    });

    /**
     * FM-148: the control box and both `FormHelperText` blocks below it must
     * share the same 560px reading-width column, so help and error prose
     * wraps at the control's own right edge on a wide viewport instead of
     * spanning the tab body's full, unboxed width (FM-147).
     */
    it("should cap the control, error, and help blocks to the same 560px column", async () => {
        const harness = renderSetting(
            <TextSetting
                help="Legacy help text"
                label="Host"
                name="main.host"
                required
            />,
        );

        const controlBox = screen
            .getByTestId("config-input-main-host")
            .closest(".MuiFormControl-root")?.parentElement;
        expect(controlBox).toHaveStyle({maxWidth: "560px"});

        const input = screen.getByTestId("config-input-main-host");
        fireEvent.change(input, {target: {value: ""}});
        expect(await harness.form.trigger()).toBe(false);

        expect(await screen.findByTestId("config-error-main-host")).toHaveStyle(
            {maxWidth: "560px"},
        );
        expect(document.getElementById("config-help-main-host")).toHaveStyle({
            maxWidth: "560px",
        });
    });

    it("should floor the fieldset's minimum width at zero so wide content cannot widen the page", () => {
        renderSetting(
            <ConfigFieldset label="Hosting">
                <TextSetting label="Host" name="main.host" />
            </ConfigFieldset>,
        );

        // ADR-0029's defect, fixed centrally rather than per tab. A
        // `<fieldset>` is not a `<div>`: its user-agent `min-inline-size:
        // min-content` makes it at least as wide as its widest descendant's
        // minimum contribution, and that minimum keeps propagating outward
        // until something stops it -- so a tab holding anything wider than
        // the column (a table with a `minWidth`, an unbreakable string)
        // scrolls *the document* sideways instead of scrolling its own
        // container. `min-width: 0` reproduces the `<div>` default exactly
        // and clamps regardless of what any descendant contributes, which a
        // wrapper inside the fieldset cannot do for its siblings.
        //
        // Matched as a zero length however it is serialised -- MUI emits the
        // unitless `0`, other stacks `0px`. Without the declaration the
        // property resolves to the empty string, which is the state this
        // pins against: the assertion was observed failing on `''` before
        // the fix.
        expect(
            globalThis.getComputedStyle(
                screen.getByTestId("config-fieldset-hosting"),
            ).minWidth,
        ).toMatch(/^0(?:px)?$/);
    });

    it("should show a validation message and refuse to validate the form", async () => {
        const harness = renderSetting(
            <NumberSetting
                label="Keep history for..."
                minimum={1}
                name="main.keepHistoryForWeeks"
                required
            />,
            {values: {main: {keepHistoryForWeeks: 4}}},
        );

        fireEvent.change(
            screen.getByTestId("config-input-main-keepHistoryForWeeks"),
            {target: {value: "0"}},
        );
        await waitFor(() => expect(harness.form.trigger()).toBeTruthy());
        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId("config-error-main-keepHistoryForWeeks"),
        ).toHaveTextContent("Must be at least 1");

        fireEvent.change(
            screen.getByTestId("config-input-main-keepHistoryForWeeks"),
            {target: {value: ""}},
        );
        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId("config-error-main-keepHistoryForWeeks"),
        ).toHaveTextContent("This field is required");
    });

    it("should report a failing pattern validator with the legacy message", async () => {
        const harness = renderSetting(
            <TextSetting
                label="Scheduled restart time"
                name="main.scheduledRestartTime"
                validate={patternValidator(
                    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
                    (value) =>
                        `${value} is not a valid time (use HH:mm format)`,
                )}
            />,
        );

        fireEvent.change(
            screen.getByTestId("config-input-main-scheduledRestartTime"),
            {target: {value: "25:00"}},
        );
        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId("config-error-main-scheduledRestartTime"),
        ).toHaveTextContent("25:00 is not a valid time (use HH:mm format)");

        // An empty value is not a pattern violation; `required` owns that.
        fireEvent.change(
            screen.getByTestId("config-input-main-scheduledRestartTime"),
            {target: {value: ""}},
        );
        expect(await harness.form.trigger()).toBe(true);
    });
});

/**
 * A fieldset whose second advanced row exists only while a plain switch in the
 * same fieldset is on -- the shape of `F-CONFIG-NOTIFICATIONS`' Apprise URL and
 * of every other `useWatch`-gated row. It is here so the hidden count is tested
 * against rows that come and go, not only against a static tree.
 */
function ConditionalAdvancedFieldset() {
    const newsShown = useWatch<ConfigValues>({name: "main.showNews"}) === true;
    return (
        <ConfigFieldset label="Hosting">
            <TextSetting label="Host" name="main.host" />
            <TextSetting advanced label="URL base" name="main.urlBase" />
            <SwitchSetting label="Show news" name="main.showNews" />
            {newsShown ? (
                <TextSetting advanced label="Dereferer" name="main.dereferer" />
            ) : null}
        </ConfigFieldset>
    );
}

const HOSTING_FIELDSET = (
    <ConfigFieldset label="Hosting">
        <TextSetting label="Host" name="main.host" />
        <TextSetting advanced label="URL base" name="main.urlBase" />
        <SwitchSetting advanced label="Use SSL" name="main.ssl" />
    </ConfigFieldset>
);

describe("C-CONFIG-FIELDS per-fieldset advanced disclosure", () => {
    it("should count the advanced rows it is hiding and reveal them in place", async () => {
        renderSetting(HOSTING_FIELDSET, {values: {main: {host: "0.0.0.0"}}});

        const expander = screen.getByTestId("config-advanced-expander-hosting");
        expect(expander).toHaveTextContent("2 advanced settings hidden");
        expect(expander).toHaveAttribute("aria-expanded", "false");
        expect(screen.getByTestId("config-setting-main-host")).toBeVisible();
        expect(screen.queryByTestId("config-setting-main-urlBase")).toBeNull();
        expect(screen.queryByTestId("config-setting-main-ssl")).toBeNull();

        fireEvent.click(expander);

        expect(screen.getByTestId("config-setting-main-urlBase")).toBeVisible();
        expect(screen.getByTestId("config-setting-main-ssl")).toBeVisible();
        expect(expander).toHaveTextContent("Hide 2 advanced settings");
        expect(expander).toHaveAttribute("aria-expanded", "true");
        // Revealed in place: the two advanced rows sit where they were
        // declared, not appended below the expander.
        expect(
            screen
                .getAllByTestId(/^config-setting-/)
                .map((element) => element.getAttribute("data-testid")),
        ).toEqual([
            "config-setting-main-host",
            "config-setting-main-urlBase",
            "config-setting-main-ssl",
        ]);

        fireEvent.click(expander);

        expect(expander).toHaveTextContent("2 advanced settings hidden");
        // Collapsing is the `Collapse` transition running in reverse, so the
        // rows leave the DOM when it finishes rather than in the click's own
        // tick; the value behind them never depended on that timing.
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-setting-main-urlBase"),
            ).toBeNull(),
        );
    });

    it("should follow an advanced row that comes and goes with a condition", () => {
        renderSetting(<ConditionalAdvancedFieldset />, {
            values: {main: {showNews: false}},
        });

        const expander = screen.getByTestId("config-advanced-expander-hosting");
        expect(expander).toHaveTextContent("1 advanced setting hidden");

        fireEvent.click(screen.getByRole("switch", {name: "Show news"}));
        expect(expander).toHaveTextContent("2 advanced settings hidden");

        fireEvent.click(screen.getByRole("switch", {name: "Show news"}));
        expect(expander).toHaveTextContent("1 advanced setting hidden");
    });

    it("should keep a value edited in a revealed row when it is hidden again", async () => {
        const harness = renderSetting(HOSTING_FIELDSET, {
            values: {main: {host: "0.0.0.0", urlBase: "/"}},
        });

        const expander = screen.getByTestId("config-advanced-expander-hosting");
        fireEvent.click(expander);
        fireEvent.change(screen.getByTestId("config-input-main-urlBase"), {
            target: {value: "/nzbhydra"},
        });
        fireEvent.click(expander);

        // The row is gone from the page and its value is still in the form,
        // which is what the next save writes back.
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-input-main-urlBase"),
            ).toBeNull(),
        );
        expect(harness.form.getValues().main).toMatchObject({
            urlBase: "/nzbhydra",
        });

        fireEvent.click(expander);
        expect(screen.getByTestId("config-input-main-urlBase")).toHaveValue(
            "/nzbhydra",
        );
    });

    it("should offer a whole advanced fieldset by name and reveal everything in it", () => {
        renderSetting(
            <ConfigFieldset advanced label="Categories">
                <TextSetting advanced label="Dereferer" name="main.dereferer" />
            </ConfigFieldset>,
            {values: {main: {dereferer: "https://deref.test/"}}},
        );

        const expander = screen.getByTestId(
            "config-advanced-expander-categories",
        );
        expect(expander).toHaveTextContent("Categories — advanced, hidden");

        fireEvent.click(expander);

        expect(screen.getByTestId("config-fieldset-categories")).toBeVisible();
        // Revealing the block reveals the block: its advanced rows come with
        // it rather than hiding behind a second expander inside the first.
        expect(
            screen.getByTestId("config-setting-main-dereferer"),
        ).toBeVisible();
        expect(
            screen.getAllByTestId(/^config-advanced-expander-/),
        ).toHaveLength(1);
        expect(expander).toHaveTextContent("Hide Categories");
    });

    it("should mark every row revealed through an expander with a chip and no other row", () => {
        renderSetting(HOSTING_FIELDSET, {values: {main: {host: "0.0.0.0"}}});

        fireEvent.click(screen.getByTestId("config-advanced-expander-hosting"));
        expect(
            screen.getByTestId("config-advanced-chip-main-urlBase"),
        ).toHaveTextContent("Advanced");
        expect(
            screen.getByTestId("config-advanced-chip-main-ssl"),
        ).toBeVisible();
        expect(
            screen.queryByTestId("config-advanced-chip-main-host"),
        ).toBeNull();

        cleanup();
        renderSetting(HOSTING_FIELDSET, {
            showAdvanced: true,
            values: {main: {host: "0.0.0.0"}},
        });

        // ADR-0027: with the global toggle on, nothing is revealed through an
        // expander, so no row carries the chip -- an unchipped row in a
        // wholly-advanced fieldset would otherwise misleadingly read as "not
        // advanced". Toggle-on rendering is pixel-identical with the
        // pre-FM-098 baseline.
        expect(screen.queryAllByTestId(/^config-advanced-expander-/)).toEqual(
            [],
        );
        expect(
            screen.queryByTestId("config-advanced-chip-main-urlBase"),
        ).toBeNull();
    });

    it("should leave an advanced row outside any fieldset hidden", () => {
        const harness = renderSetting(
            <TextSetting advanced label="Dereferer" name="main.dereferer" />,
            {values: {main: {dereferer: "https://deref.test/"}}},
        );

        expect(
            screen.queryByTestId("config-setting-main-dereferer"),
        ).toBeNull();
        expect(screen.queryAllByTestId(/^config-advanced-expander-/)).toEqual(
            [],
        );
        expect(harness.form.getValues().main).toEqual({
            dereferer: "https://deref.test/",
        });
    });
});

/**
 * Records every `register` call and every id withdrawn through its returned
 * cleanup — and, separately, the set that is *live* right now.
 *
 * The two are not interchangeable, which is the point of keeping both.
 * `register` hands back a fresh closure per call, so a component that
 * withdraws and immediately re-registers (React runs an effect's cleanup
 * before its body) appends to `registered` and to `unregisteredIds` and looks
 * perfectly balanced from either list alone. Only `live` — what
 * `useFieldsetNav`'s own map would hold — shows that the entry came back. A
 * "did it unregister?" assertion written against `unregisteredIds` alone
 * therefore passes whether or not the entry is really gone.
 */
function createRecordingRegistry(): {
    live: ReadonlyMap<string, {label: string; node: HTMLElement}>;
    registered: {id: string; label: string; node: HTMLElement}[];
    registry: FieldsetNavRegistry;
    unregisteredIds: string[];
} {
    const registered: {id: string; label: string; node: HTMLElement}[] = [];
    const unregisteredIds: string[] = [];
    const live = new Map<string, {label: string; node: HTMLElement}>();
    const registry: FieldsetNavRegistry = {
        register: (id, label, node) => {
            registered.push({id, label, node});
            live.set(id, {label, node});
            return () => {
                unregisteredIds.push(id);
                live.delete(id);
            };
        },
    };
    return {live, registered, registry, unregisteredIds};
}

/** Mounts `children` until "toggle" is clicked, then unmounts them. */
function Toggleable({children}: {children: React.ReactNode}) {
    const [shown, setShown] = useState(true);
    return (
        <>
            <button
                data-testid="toggle"
                onClick={() => setShown((current) => !current)}
                type="button"
            >
                Toggle
            </button>
            {shown ? children : null}
        </>
    );
}

describe("C-CONFIG-FIELDS FM-102 on-this-page registration", () => {
    it("should register its own <fieldset> element under its legend", () => {
        const {registered, registry} = createRecordingRegistry();
        renderSetting(HOSTING_FIELDSET, {
            fieldsetNavRegistry: registry,
            values: {main: {host: "0.0.0.0"}},
        });

        expect(registered).toHaveLength(1);
        expect(registered[0].label).toBe("Hosting");
        expect(registered[0].node).toBe(
            screen.getByTestId("config-fieldset-hosting"),
        );
    });

    it("should withdraw its registration when it unmounts", () => {
        const {live, registered, registry, unregisteredIds} =
            createRecordingRegistry();
        renderSetting(<Toggleable>{HOSTING_FIELDSET}</Toggleable>, {
            fieldsetNavRegistry: registry,
            values: {main: {host: "0.0.0.0"}},
        });
        const [{id}] = registered;

        fireEvent.click(screen.getByTestId("toggle"));

        expect(unregisteredIds).toEqual([id]);
        expect([...live.keys()]).toEqual([]);
    });

    it("should have no entry for a collapsed whole-advanced fieldset, and register/withdraw it as it is revealed and hidden again", () => {
        const {live, registered, registry, unregisteredIds} =
            createRecordingRegistry();
        renderSetting(
            <ConfigFieldset advanced label="Categories">
                <TextSetting advanced label="Dereferer" name="main.dereferer" />
            </ConfigFieldset>,
            {
                fieldsetNavRegistry: registry,
                values: {main: {dereferer: "https://deref.test/"}},
            },
        );

        // Nothing to register while collapsed: there is no `<fieldset>`
        // element on the page yet, so the list is correct by construction
        // rather than needing this case filtered back out.
        expect(registered).toHaveLength(0);
        expect([...live.keys()]).toEqual([]);

        fireEvent.click(
            screen.getByTestId("config-advanced-expander-categories"),
        );

        expect(registered).toHaveLength(1);
        expect(registered[0].label).toBe("Categories");
        expect(registered[0].node).toBe(
            screen.getByTestId("config-fieldset-categories"),
        );
        const [{id}] = registered;

        fireEvent.click(
            screen.getByTestId("config-advanced-expander-categories"),
        );

        // Withdrawn the moment the click is handled, without waiting for the
        // `Collapse` exit transition to finish removing the element.
        expect(unregisteredIds).toEqual([id]);
        // And *stays* withdrawn. This is the assertion that bites: `Collapse`
        // forwards `unmountOnExit` to react-transition-group, which keeps the
        // `<fieldset>` mounted right through `EXITING`, so an implementation
        // that re-reads a ref in the same effect finds the outgoing element
        // still there and immediately re-registers — balanced from
        // `unregisteredIds`' point of view, and a permanently stale entry
        // pointing at a node that is about to be detached.
        expect([...live.keys()]).toEqual([]);
    });

    it("should register an advanced fieldset directly, against its own <fieldset>, once the global toggle is on", () => {
        const {registered, registry} = createRecordingRegistry();
        renderSetting(
            <ConfigFieldset advanced label="Categories">
                <TextSetting advanced label="Dereferer" name="main.dereferer" />
            </ConfigFieldset>,
            {
                fieldsetNavRegistry: registry,
                showAdvanced: true,
                values: {main: {dereferer: "https://deref.test/"}},
            },
        );

        expect(registered).toHaveLength(1);
        expect(registered[0].node).toBe(
            screen.getByTestId("config-fieldset-categories"),
        );
    });
});

describe("C-SECRET-INPUT unchanged-marker semantics", () => {
    it("should hide a server-masked value behind a placeholder and send the marker back untouched", () => {
        const harness = renderSetting(
            <SecretInput label="Proxy password" name="main.proxyPassword" />,
            {values: {main: {proxyPassword: UNCHANGED_SECRET_MARKER}}},
        );

        const input = screen.getByTestId("config-input-main-proxyPassword");
        expect(input).toHaveValue("");
        expect(input).toHaveAttribute("placeholder", "Value unchanged");
        expect(input).toHaveAttribute("type", "password");
        // Untouched: exactly what the server sent goes back.
        expect(harness.form.getValues().main).toEqual({
            proxyPassword: UNCHANGED_SECRET_MARKER,
        });
    });

    it("should send the typed value once the admin edits a masked field", () => {
        const harness = renderSetting(
            <SecretInput label="Proxy password" name="main.proxyPassword" />,
            {values: {main: {proxyPassword: UNCHANGED_SECRET_MARKER}}},
        );

        fireEvent.change(
            screen.getByTestId("config-input-main-proxyPassword"),
            {
                target: {value: "new-secret"},
            },
        );
        expect(harness.form.getValues().main).toEqual({
            proxyPassword: "new-secret",
        });
        expect(
            screen.getByTestId("config-input-main-proxyPassword"),
        ).toHaveValue("new-secret");
    });

    it("should restore a marker it was given rather than clearing the stored secret", () => {
        const harness = renderSetting(
            <SecretInput label="Proxy password" name="main.proxyPassword" />,
            {values: {main: {proxyPassword: UNCHANGED_SECRET_MARKER}}},
        );

        const input = screen.getByTestId("config-input-main-proxyPassword");
        fireEvent.change(input, {target: {value: "typo"}});
        fireEvent.change(input, {target: {value: ""}});

        expect(harness.form.getValues().main).toEqual({
            proxyPassword: UNCHANGED_SECRET_MARKER,
        });
        expect(input).toHaveAttribute("placeholder", "Value unchanged");
    });

    it("should round-trip a value the server did not mask in clear and never emit the marker for it", () => {
        const harness = renderSetting(
            <SecretInput
                label="SSL keystore password"
                name="main.sslKeyStorePassword"
            />,
            {values: {main: {sslKeyStorePassword: "in-the-clear"}}},
        );

        const input = screen.getByTestId(
            "config-input-main-sslKeyStorePassword",
        );
        expect(input).toHaveValue("in-the-clear");
        expect(input).not.toHaveAttribute("placeholder", "Value unchanged");
        expect(harness.form.getValues().main).toEqual({
            sslKeyStorePassword: "in-the-clear",
        });

        // Clearing an unmasked secret really clears it: the client must never
        // invent the marker for a value the server sent in the clear.
        fireEvent.change(input, {target: {value: ""}});
        expect(harness.form.getValues().main).toEqual({
            sslKeyStorePassword: "",
        });
        expect(JSON.stringify(harness.form.getValues())).not.toContain(
            UNCHANGED_SECRET_MARKER,
        );
    });

    it("should reveal and hide the value on request", () => {
        renderSetting(
            <SecretInput
                label="SSL keystore password"
                name="main.sslKeyStorePassword"
            />,
            {values: {main: {sslKeyStorePassword: "in-the-clear"}}},
        );

        const input = screen.getByTestId(
            "config-input-main-sslKeyStorePassword",
        );
        expect(input).toHaveAttribute("type", "password");
        fireEvent.click(
            screen.getByTestId("config-secret-reveal-main-sslKeyStorePassword"),
        );
        expect(input).toHaveAttribute("type", "text");
        fireEvent.click(
            screen.getByTestId("config-secret-reveal-main-sslKeyStorePassword"),
        );
        expect(input).toHaveAttribute("type", "password");
    });
});

describe("C-CONFIG-FIELDS file browser", () => {
    function browserBackend(listings: Record<string, unknown>) {
        const requests: unknown[] = [];
        const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
            const body = JSON.parse(String(init?.body)) as {
                fullPath: string | null;
                goUp: boolean;
            };
            requests.push(body);
            const key = `${body.fullPath ?? ""}|${String(body.goUp)}`;
            return new Response(JSON.stringify(listings[key] ?? {}), {
                headers: {"Content-Type": "application/json"},
            });
        });
        return {fetchMock, requests};
    }

    it("should browse folders, walk up, and write the chosen folder into the field", async () => {
        const {fetchMock, requests} = browserBackend({
            "/data|false": {
                fullPath: "/data",
                hasParent: true,
                folders: [{name: "backup", fullPath: "/data/backup"}],
                files: [],
            },
            "/data/backup|false": {
                fullPath: "/data/backup",
                hasParent: true,
                folders: [],
                files: [],
            },
            "/data/backup|true": {
                fullPath: "/data",
                hasParent: true,
                folders: [{name: "backup", fullPath: "/data/backup"}],
                files: [],
            },
        });
        const harness = renderSetting(
            <FileBrowserSetting
                label="Backup folder"
                mode="folder"
                name="main.backupFolder"
                transport={new ApiTransport("/", fetchMock)}
            />,
            {values: {main: {backupFolder: "/data"}}},
        );
        // Reading `isDirty` first subscribes this harness to it; React Hook
        // Form only maintains the flag for the fields a consumer observes.
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(
            screen.getByTestId("config-file-browse-main-backupFolder"),
        );
        const dialog = await screen.findByTestId("config-file-browser-dialog");
        await waitFor(() =>
            expect(
                within(dialog).getByTestId("config-file-browser-path"),
            ).toHaveTextContent("/data"),
        );

        fireEvent.click(
            within(dialog).getByTestId("config-file-browser-folder"),
        );
        await waitFor(() =>
            expect(
                within(dialog).getByTestId("config-file-browser-path"),
            ).toHaveTextContent("/data/backup"),
        );

        fireEvent.click(within(dialog).getByTestId("config-file-browser-up"));
        await waitFor(() =>
            expect(
                within(dialog).getByTestId("config-file-browser-path"),
            ).toHaveTextContent("/data"),
        );
        expect(requests).toContainEqual({
            fullPath: "/data/backup",
            goUp: true,
            type: "folder",
        });

        fireEvent.click(
            within(dialog).getByTestId("config-file-browser-select"),
        );
        await waitFor(() =>
            expect(harness.form.getValues().main).toEqual({
                backupFolder: "/data",
            }),
        );
        expect(harness.form.formState.isDirty).toBe(false);
        expect(screen.queryByTestId("config-file-browser-dialog")).toBeNull();
    });

    it("should list files in file mode and write the chosen file into the field", async () => {
        const {fetchMock, requests} = browserBackend({
            "|false": {
                fullPath: "/etc",
                hasParent: true,
                folders: [],
                files: [{name: "keystore.jks", fullPath: "/etc/keystore.jks"}],
            },
        });
        const harness = renderSetting(
            <FileBrowserSetting
                label="SSL keystore file"
                mode="file"
                name="main.sslKeyStore"
                transport={new ApiTransport("/", fetchMock)}
            />,
        );
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(
            screen.getByTestId("config-file-browse-main-sslKeyStore"),
        );
        const dialog = await screen.findByTestId("config-file-browser-dialog");
        expect(requests).toEqual([{fullPath: null, goUp: false, type: "file"}]);
        // Choosing the current folder is a folder-mode affordance only.
        expect(
            within(dialog).queryByTestId("config-file-browser-select"),
        ).toBeNull();

        fireEvent.click(
            await within(dialog).findByTestId("config-file-browser-file"),
        );
        await waitFor(() =>
            expect(harness.form.getValues().main).toEqual({
                sslKeyStore: "/etc/keystore.jks",
            }),
        );
        expect(harness.form.formState.isDirty).toBe(true);
    });
});
