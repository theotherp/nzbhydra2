import {ThemeProvider} from "@mui/material";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useEffect} from "react";
import {
    FormProvider,
    useController,
    useForm,
    type UseFormReturn,
} from "react-hook-form";
import {afterEach, describe, expect, it} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {createHydraTheme} from "../../../app/theme";
import {RepeatSection} from "./RepeatSection";
import {settingInputTestId, type ConfigFieldPath} from "./settings";

/**
 * `RepeatSection`'s own mechanics, independent of any one consumer.
 * `F-CONFIG-AUTH`'s Users section (`AuthConfigTab.test.tsx`) covers the first
 * real consumer's field layout; these tests cover add/remove/legend/dirty
 * behaviour with a minimal single-field entry instead.
 */

type Entry = {label: string | null};

function EntryField({index}: {index: number}) {
    const path = `main.entries.${index}.label` as ConfigFieldPath;
    const {field} = useController<ConfigValues>({name: path});
    return (
        <input
            data-testid={settingInputTestId(path)}
            onChange={(event) => field.onChange(event.target.value)}
            value={(field.value as string | null) ?? ""}
        />
    );
}

type Harness = {form: UseFormReturn<ConfigValues>};

function renderRepeat(initial: readonly Entry[]): Harness {
    const harness = {} as Harness;
    function Host() {
        const form = useForm<ConfigValues>({
            defaultValues: {main: {entries: initial}},
            shouldUnregister: false,
        });
        useEffect(() => {
            harness.form = form;
        }, [form]);
        return (
            <ThemeProvider theme={createHydraTheme("dark")}>
                <FormProvider {...form}>
                    <RepeatSection<Entry>
                        addLabel="Add entry"
                        defaultEntry={() => ({label: null})}
                        entryLegend={(entry) => entry.label ?? "Unnamed"}
                        name="main.entries"
                        renderEntry={(index) => <EntryField index={index} />}
                    />
                </FormProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

function entries(harness: Harness): Entry[] {
    return (harness.form.getValues().main as {entries: Entry[]}).entries;
}

afterEach(cleanup);

describe("C-CONFIG-FIELDS RepeatSection", () => {
    it("should append a default entry at the end and mark the form dirty", () => {
        const harness = renderRepeat([{label: "first"}]);
        // Reading `isDirty` first subscribes this harness to it; React Hook
        // Form only maintains the flag for the fields a consumer observes.
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(screen.getByTestId("config-repeat-add-main-entries"));

        expect(entries(harness)).toEqual([{label: "first"}, {label: null}]);
        expect(harness.form.formState.isDirty).toBe(true);
        expect(
            screen.getByTestId("config-repeat-entry-main-entries-1"),
        ).toBeVisible();
    });

    it("should remove an entry by index, shifting the rest down, and mark the form dirty", () => {
        const harness = renderRepeat([{label: "first"}, {label: "second"}]);
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(
            screen.getByTestId("config-repeat-remove-main-entries-0"),
        );

        expect(entries(harness)).toEqual([{label: "second"}]);
        expect(harness.form.formState.isDirty).toBe(true);
        // The remaining entry now renders -- and edits -- at index 0, matching
        // the array position the backend will save it at.
        expect(
            screen.getByTestId("config-input-main-entries-0-label"),
        ).toHaveValue("second");
        expect(
            screen.queryByTestId("config-repeat-entry-main-entries-1"),
        ).toBeNull();
    });

    it("should label each entry from entryLegend, falling back for a blank one", () => {
        renderRepeat([{label: "Alice"}, {label: null}]);

        expect(
            screen.getByRole("heading", {level: 3, name: "Alice"}),
        ).toBeVisible();
        expect(
            screen.getByRole("heading", {level: 3, name: "Unnamed"}),
        ).toBeVisible();
    });

    it("should edit an entry's field through the shared form", () => {
        const harness = renderRepeat([{label: "first"}]);

        fireEvent.change(
            screen.getByTestId("config-input-main-entries-0-label"),
            {target: {value: "renamed"}},
        );

        expect(entries(harness)).toEqual([{label: "renamed"}]);
    });
});
