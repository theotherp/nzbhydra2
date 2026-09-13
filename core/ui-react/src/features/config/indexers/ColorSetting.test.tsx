import {ThemeProvider} from "@mui/material";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useEffect} from "react";
import {FormProvider, useForm, type UseFormReturn} from "react-hook-form";
import {afterEach, describe, expect, it} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {createHydraTheme} from "../../../app/theme";
import {ColorSetting, hexToRgb, rgbToHex} from "./ColorSetting";
import {draftFieldPath} from "./indexerSettings";

type Harness = {form: UseFormReturn<ConfigValues>};

function renderColorSetting(color: unknown): Harness {
    const harness = {} as Harness;
    function Host() {
        const form = useForm<ConfigValues>({
            defaultValues: {indexerDraft: {color}} as unknown as ConfigValues,
            shouldUnregister: false,
        });
        useEffect(() => {
            harness.form = form;
        }, [form]);
        return (
            <ThemeProvider theme={createHydraTheme("grey")}>
                <FormProvider {...form}>
                    <ColorSetting
                        label="Color"
                        name={draftFieldPath("color")}
                    />
                </FormProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

function draftColor(harness: Harness): unknown {
    return (
        harness.form.getValues().indexerDraft as {color?: unknown} | undefined
    )?.color;
}

afterEach(() => {
    cleanup();
});

describe("ColorSetting", () => {
    it("picking a colour writes an rgb(...) string, not the hex the native input speaks", () => {
        const harness = renderColorSetting(null);
        // Reading `isDirty` first subscribes this harness to it; React Hook
        // Form only maintains the flag for the fields a consumer observes.
        expect(harness.form.formState.isDirty).toBe(false);
        expect(screen.getByTestId("config-indexer-color-picker")).toBeVisible();
        const nativeInput = document.querySelector(
            'input[type="color"]',
        ) as HTMLInputElement;
        fireEvent.change(nativeInput, {target: {value: "#742a2a"}});

        expect(draftColor(harness)).toBe("rgb(116,42,42)");
        expect(harness.form.formState.isDirty).toBe(true);
    });

    it("clear yields null -- not '' and not the native input's black default", () => {
        const harness = renderColorSetting("rgb(116,18,18)");
        fireEvent.click(screen.getByTestId("config-indexer-color-clear"));

        expect(draftColor(harness)).toBeNull();
        expect(draftColor(harness)).not.toBe("");
        expect(draftColor(harness)).not.toBe("rgb(0,0,0)");
    });

    it("never writes on mount even though the native input cannot represent 'no colour'", () => {
        const harness = renderColorSetting(null);
        expect(draftColor(harness)).toBeNull();
        expect(harness.form.formState.isDirty).toBe(false);
    });

    it("seeds the picker from a valid rgb(...) value", () => {
        renderColorSetting("rgb(116,18,18)");
        const nativeInput = document.querySelector(
            'input[type="color"]',
        ) as HTMLInputElement;
        expect(nativeInput.value).toBe("#741212");
    });

    it("a malformed or empty text value never crashes the picker seed", () => {
        expect(() => renderColorSetting("not-a-color")).not.toThrow();
        cleanup();
        expect(() => renderColorSetting("")).not.toThrow();
        cleanup();
        expect(() => renderColorSetting(undefined)).not.toThrow();

        const nativeInput = document.querySelector(
            'input[type="color"]',
        ) as HTMLInputElement;
        // The browser's own default for an unseeded input, never written back.
        expect(nativeInput.value).toBe("#000000");
    });

    it("the text field stays freely editable and keeps whatever string is typed", () => {
        const harness = renderColorSetting(null);
        const textInput = screen.getByTestId(
            "config-input-indexerDraft-color",
        ) as HTMLInputElement;
        fireEvent.change(textInput, {target: {value: "rgb(1,2,3)"}});
        expect(draftColor(harness)).toBe("rgb(1,2,3)");
    });
});

describe("rgbToHex / hexToRgb", () => {
    it("round-trips a well-formed rgb(...) string", () => {
        expect(rgbToHex("rgb(116,18,18)")).toBe("#741212");
        expect(hexToRgb("#741212")).toBe("rgb(116,18,18)");
    });

    it("rejects anything that is not exactly rgb(r,g,b)", () => {
        expect(rgbToHex(null)).toBeNull();
        expect(rgbToHex(undefined)).toBeNull();
        expect(rgbToHex("")).toBeNull();
        expect(rgbToHex("rgba(116,18,18,0.5)")).toBeNull();
        expect(rgbToHex("#741212")).toBeNull();
        expect(rgbToHex("not-a-color")).toBeNull();
    });
});
