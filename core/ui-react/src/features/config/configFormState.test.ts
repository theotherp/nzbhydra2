import {act, renderHook} from "@testing-library/react";
import {useFieldArray, useForm} from "react-hook-form";
import {describe, expect, it} from "vitest";

import {
    configTabForSectionKey,
    countDirtyFields,
    dirtyConfigTabs,
    hasFieldError,
    invalidConfigTabs,
} from "./configFormState";
import {CONFIG_TABS} from "./configTabs";

const defaults = {
    main: {host: "0.0.0.0", port: 5076, ui: {theme: "dark", density: 1}},
    categoriesConfig: {categories: [{name: "movies", min: 0}]},
    indexers: [
        {name: "one", host: "h1", score: 1},
        {name: "two", host: "h2", score: 2},
        {name: "three", host: "h3", score: 3},
    ],
    emby: {host: "http://emby"},
};

/**
 * A real `useForm` plus `useFieldArray`, not a hand-written fixture: the whole
 * point of these helpers is to survive what React Hook Form actually puts in
 * `dirtyFields`, which is neither dense nor minimal (see `configFormState.ts`).
 *
 * `formState` is a subscription proxy — it stays empty unless something reads
 * the key during render, which is exactly what `ConfigShell` does — so the
 * hook reads `dirtyFields` on every render to arm it.
 */
function renderConfigForm() {
    return renderHook(() => {
        const form = useForm({defaultValues: defaults});
        const indexers = useFieldArray({
            control: form.control,
            name: "indexers",
        });
        return {dirtyFields: form.formState.dirtyFields, form, indexers};
    });
}

describe("countDirtyFields", () => {
    it("should count nothing while the form is pristine", () => {
        const {result} = renderConfigForm();
        expect(countDirtyFields(result.current.dirtyFields)).toBe(0);
    });

    it("should count a scalar and a nested-object edit once each", () => {
        const {result} = renderConfigForm();

        act(() => {
            result.current.form.setValue("main.host", "10.0.0.1", {
                shouldDirty: true,
            });
            result.current.form.setValue("main.ui.theme", "light", {
                shouldDirty: true,
            });
        });

        expect(result.current.dirtyFields).toEqual({
            main: {host: true, ui: {theme: true}},
        });
        expect(countDirtyFields(result.current.dirtyFields)).toBe(2);
    });

    it("should stop counting a field that was edited back to its loaded value", () => {
        const {result} = renderConfigForm();

        act(() => {
            result.current.form.setValue("main.host", "10.0.0.1", {
                shouldDirty: true,
            });
        });
        expect(countDirtyFields(result.current.dirtyFields)).toBe(1);

        act(() => {
            result.current.form.setValue("main.host", "0.0.0.0", {
                shouldDirty: true,
            });
        });
        expect(countDirtyFields(result.current.dirtyFields)).toBe(0);
    });

    it("should count an array entry once however many of its fields changed, skipping untouched slots", () => {
        const {result} = renderConfigForm();

        act(() => {
            result.current.form.setValue("indexers.2.host", "changed", {
                shouldDirty: true,
            });
            result.current.form.setValue("indexers.2.score", 42, {
                shouldDirty: true,
            });
        });

        // What RHF really produces: leading slots that exist and hold
        // `undefined`, and one entry with two of its three fields marked.
        const dirty = result.current.dirtyFields.indexers as unknown[];
        expect(dirty[0]).toBeUndefined();
        expect(dirty[1]).toBeUndefined();
        expect(dirty[2]).toEqual({host: true, score: true});
        expect(countDirtyFields(result.current.dirtyFields)).toBe(1);
    });

    it("should count an appended entry as one change, not one per field", () => {
        const {result} = renderConfigForm();

        act(() => {
            result.current.indexers.append({
                name: "four",
                host: "h4",
                score: 4,
            });
        });

        expect(result.current.dirtyFields.indexers?.[3]).toEqual({
            name: true,
            host: true,
            score: true,
        });
        expect(countDirtyFields(result.current.dirtyFields)).toBe(1);
    });

    it("should count each entry a removal re-marks once, however wholly RHF marked it", () => {
        const {result} = renderConfigForm();

        act(() => {
            result.current.indexers.remove(0);
        });

        // Removing the head shifts every survivor to a new index, so RHF
        // re-marks all of them dirty in full *and* keeps a third marked slot
        // for the entry that no longer exists — nine field flags for what an
        // admin sees as one removal. The entry rule turns that into 3, which
        // is a defensible "three list positions differ from what was loaded";
        // pinned here so a future RHF upgrade that changes the shape is
        // noticed rather than silently re-scored.
        expect(countDirtyFields(result.current.dirtyFields)).toBe(3);
    });

    it("should count a dirty primitive-array element once", () => {
        expect(countDirtyFields({main: {hosts: [undefined, true]}})).toBe(1);
    });

    it("should ignore anything that is not a dirty marker", () => {
        expect(countDirtyFields(undefined)).toBe(0);
        expect(countDirtyFields(null)).toBe(0);
        expect(countDirtyFields(false)).toBe(0);
        expect(countDirtyFields({main: {host: false}})).toBe(0);
        expect(countDirtyFields({indexers: [null, null]})).toBe(0);
    });
});

describe("hasFieldError", () => {
    it("should recognize a field error, a nested one, and an array-level one", () => {
        expect(
            hasFieldError({message: "Required", type: "required", ref: {}}),
        ).toBe(true);
        expect(
            hasFieldError({ui: {theme: {type: "validate", message: "Nope"}}}),
        ).toBe(true);
        expect(
            hasFieldError({root: {type: "custom", message: "Too few"}}),
        ).toBe(true);
        expect(
            hasFieldError([undefined, {host: {type: "required", ref: {}}}]),
        ).toBe(true);
    });

    it("should not treat an empty tree or a bare ref as an error", () => {
        expect(hasFieldError(undefined)).toBe(false);
        expect(hasFieldError({})).toBe(false);
        expect(hasFieldError({main: {}})).toBe(false);
        expect(hasFieldError({ref: {name: "main.host"}})).toBe(false);
        expect(hasFieldError([undefined, undefined])).toBe(false);
    });
});

describe("configTabForSectionKey", () => {
    it("should map every config section onto an existing tab", () => {
        expect(configTabForSectionKey("main")).toBe("main");
        expect(configTabForSectionKey("auth")).toBe("auth");
        expect(configTabForSectionKey("searching")).toBe("searching");
        expect(configTabForSectionKey("categoriesConfig")).toBe("categories");
        expect(configTabForSectionKey("downloading")).toBe("downloading");
        expect(configTabForSectionKey("externalTools")).toBe("externalTools");
        expect(configTabForSectionKey("indexers")).toBe("indexers");
        expect(configTabForSectionKey("notificationConfig")).toBe(
            "notifications",
        );
    });

    it("should cover every canonical tab exactly once", () => {
        const mapped = CONFIG_TABS.map((tab) => tab.path).filter((path) =>
            [
                "main",
                "auth",
                "searching",
                "categoriesConfig",
                "downloading",
                "externalTools",
                "indexers",
                "notificationConfig",
            ].some((key) => configTabForSectionKey(key) === path),
        );
        expect(mapped).toEqual(CONFIG_TABS.map((tab) => tab.path));
    });

    it("should map no tab for a section the UI does not edit", () => {
        expect(configTabForSectionKey("emby")).toBeUndefined();
        expect(configTabForSectionKey("genericStorage")).toBeUndefined();
        expect(configTabForSectionKey("categories")).toBeUndefined();
        expect(configTabForSectionKey("notifications")).toBeUndefined();
    });
});

describe("dirtyConfigTabs / invalidConfigTabs", () => {
    it("should badge only the tabs whose own section changed", () => {
        const {result} = renderConfigForm();

        act(() => {
            result.current.form.setValue("main.port", 5077, {
                shouldDirty: true,
            });
            result.current.form.setValue(
                "categoriesConfig.categories.0.min",
                10,
                {shouldDirty: true},
            );
        });

        expect([...dirtyConfigTabs(result.current.dirtyFields)].sort()).toEqual(
            ["categories", "main"],
        );
    });

    it("should badge no tab for a section no tab edits", () => {
        expect([...dirtyConfigTabs({emby: {host: true}})]).toEqual([]);
    });

    it("should badge the tab of a section holding a validation error", () => {
        expect([
            ...invalidConfigTabs({
                notificationConfig: {
                    entries: [
                        undefined,
                        {
                            titleTemplate: {
                                type: "required",
                                message: "Required",
                            },
                        },
                    ],
                },
                emby: {host: {type: "required", message: "Required"}},
            }),
        ]).toEqual(["notifications"]);
    });

    it("should badge nothing for an empty error tree", () => {
        expect([...invalidConfigTabs({})]).toEqual([]);
        expect([...invalidConfigTabs(undefined)]).toEqual([]);
    });
});
