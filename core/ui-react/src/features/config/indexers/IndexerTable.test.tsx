import {ThemeProvider} from "@mui/material";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {useEffect} from "react";
import {FormProvider, useForm, type UseFormReturn} from "react-hook-form";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import type {IndexerValues} from "../../../api/config/indexers";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {DialogProvider} from "../../../components/dialogs/DialogProvider";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {ShowAdvancedContext} from "../advancedFields";
import {IndexersConfigTab} from "./IndexersConfigTab";

/**
 * FM-168's render counter.
 *
 * `IndexerTableRow` opens with `const legend = indexerLegend(entry)` and calls
 * it exactly once, so counting calls to the module's *exported* binding counts
 * executions of the row function body, keyed by the row's own name. Nothing
 * else in the mounted tree calls it: `IndexerDialog` does (its title), but no
 * dialog is open in these cases, and `sortIndexers`/`filterIndexers` reach
 * their own module-local binding rather than this wrapper.
 *
 * This is deliberately not a `Profiler` or a wrapper component: a wrapper would
 * be a prop of the row and could itself change the memoization the case exists
 * to measure.
 */
const rowRenders = vi.hoisted(() => new Map<string, number>());

/**
 * The tab's render counter, and the other half of FM-168's narrowing.
 *
 * `IndexersConfigTab` calls `indexerCategoryOptions` once, unconditionally, in
 * its own body, and nothing else in the mounted tree calls it at all — so
 * counting calls to the module's exported binding counts executions of the tab
 * function itself. That is what the `compute` projection on its `useWatch` is
 * for: rows are memoized, so a tab that re-rendered on every keystroke anywhere
 * under `indexers` would leave every row-level assertion in this file green.
 */
const tabRenders = vi.hoisted(() => ({count: 0}));

vi.mock("./indexerSettings", async (importOriginal) => {
    const actual = await importOriginal<typeof import("./indexerSettings")>();
    return {
        ...actual,
        indexerCategoryOptions: (categories: unknown) => {
            tabRenders.count += 1;
            return actual.indexerCategoryOptions(categories);
        },
        indexerLegend: (entry: IndexerValues) => {
            const legend = actual.indexerLegend(entry);
            rowRenders.set(legend, (rowRenders.get(legend) ?? 0) + 1);
            return legend;
        },
    };
});

type Harness = {form: UseFormReturn<ConfigValues>};

function newznab(overrides: IndexerValues = {}): IndexerValues {
    return {
        allCapsChecked: true,
        apiPath: "/api",
        configComplete: true,
        enabledForSearchSource: "BOTH",
        host: "http://mock",
        name: "Mock",
        score: 0,
        searchModuleType: "NEWZNAB",
        state: "ENABLED",
        vipExpirationDate: null,
        ...overrides,
    };
}

/**
 * `count` indexers with distinct names and distinct priorities, so the default
 * ordering (`-state`, `-score`, `name`) is total and every row is addressable
 * by both its configuration index and its name.
 */
function indexerList(count: number): IndexerValues[] {
    return Array.from({length: count}, (_unused, index) =>
        newznab({
            name: `Indexer ${String(index).padStart(2, "0")}`,
            score: index,
        }),
    );
}

function renderTab(indexers: IndexerValues[]): Harness {
    const harness = {} as Harness;
    const transport = new ApiTransport("/", (() => {
        throw new Error("no request expected");
    }) as unknown as typeof fetch);
    function Host() {
        const form = useForm<ConfigValues>({
            defaultValues: structuredClone({
                categoriesConfig: {categories: [{name: "All"}]},
                indexers,
            }) as ConfigValues,
            shouldUnregister: false,
        });
        useEffect(() => {
            harness.form = form;
        }, [form]);
        return (
            <ThemeProvider theme={createHydraTheme("grey")}>
                <DialogProvider>
                    <ToastProvider>
                        <FormProvider {...form}>
                            <ShowAdvancedContext.Provider value>
                                <IndexersConfigTab transport={transport} />
                            </ShowAdvancedContext.Provider>
                        </FormProvider>
                    </ToastProvider>
                </DialogProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

function snapshotRenders(): Map<string, number> {
    return new Map(rowRenders);
}

/** How much each row rendered since `before`, for every row that ever has. */
function rendersSince(before: Map<string, number>): Map<string, number> {
    const delta = new Map<string, number>();
    for (const [name, total] of rowRenders) {
        delta.set(name, total - (before.get(name) ?? 0));
    }
    return delta;
}

function rowNames(): (string | null)[] {
    return screen
        .getAllByTestId(/^config-indexer-edit-/)
        .map((button) => button.textContent);
}

function indexersOf(harness: Harness): IndexerValues[] {
    return (harness.form.getValues().indexers ?? []) as IndexerValues[];
}

describe("IndexerTable render isolation", () => {
    beforeEach(() => {
        rowRenders.clear();
        tabRenders.count = 0;
    });

    afterEach(() => {
        cleanup();
    });

    it("re-renders only the typed-in row when a priority cell is edited", async () => {
        const harness = renderTab(indexerList(12));
        expect(rowNames()).toHaveLength(12);

        const edited = screen.getByTestId("config-input-indexers-3-score");
        // The freeze is installed on focus, before the measurement, so what is
        // measured is the keystroke alone and not the focus that preceded it.
        fireEvent.focus(edited);
        await act(async () => {});

        const before = snapshotRenders();
        fireEvent.change(edited, {target: {value: "42"}});
        await waitFor(() => {
            expect(indexersOf(harness)[3].score).toBe(42);
        });
        await act(async () => {});
        const delta = rendersSince(before);

        const untouched = [...delta.entries()].filter(
            ([name]) => name !== "Indexer 03",
        );
        expect(untouched).toHaveLength(11);
        for (const [name, count] of untouched) {
            expect([name, count]).toEqual([name, 0]);
        }
        // The edited row may re-render for its own value; it must not do so
        // more than a small, constant number of times.
        expect(delta.get("Indexer 03") ?? 0).toBeLessThanOrEqual(2);
    });

    it("does not wake the row at index 1 when index 10 is edited", async () => {
        // The hazard `ROW_DISPLAY_FIELDS` names: React Hook Form matches a
        // subscription to a signal when *either* name is a prefix of the
        // other, so a row watching `indexers.1` whole is woken by every change
        // under `indexers.10` and `indexers.11`. Naming full leaf paths breaks
        // the collision — `indexers.1.name` is not a prefix of
        // `indexers.10.score`, and vice versa — and this is the case that
        // proves it, at the only pair of indices where it can be proven.
        const harness = renderTab(indexerList(12));

        const edited = screen.getByTestId("config-input-indexers-10-score");
        fireEvent.focus(edited);
        await act(async () => {});

        const before = snapshotRenders();
        fireEvent.change(edited, {target: {value: "42"}});
        await waitFor(() => {
            expect(indexersOf(harness)[10].score).toBe(42);
        });
        await act(async () => {});
        const delta = rendersSince(before);

        expect(delta.get("Indexer 01") ?? 0).toBe(0);
        for (const [name, count] of delta) {
            if (name !== "Indexer 10") {
                expect([name, count]).toEqual([name, 0]);
            }
        }
    });

    it("does not re-render the tab when a cell outside its projection is edited", async () => {
        const harness = renderTab(indexerList(12));

        // `enabledForSearchSource` is the one editable cell that is in neither
        // `IndexerListEntry` (the tab's projection) nor `ROW_DISPLAY_FIELDS`
        // (the row's), so writing it must wake nothing above the control.
        const pickSearchSource = async (index: number, option: string) => {
            fireEvent.mouseDown(
                within(
                    screen.getByTestId(
                        `config-input-indexers-${String(index)}-enabledForSearchSource`,
                    ),
                ).getByRole("combobox"),
            );
            fireEvent.click(await screen.findByRole("option", {name: option}));
            await act(async () => {});
        };

        // One warm-up write first. `useWatch`'s computed value starts as
        // `undefined` rather than as the projection of the mounted values, so
        // the very first signal of any kind is unequal to it and re-renders
        // once whatever changed — an initialization, not a subscription width.
        await pickSearchSource(4, "API searches only");
        await waitFor(() => {
            expect(indexersOf(harness)[4].enabledForSearchSource).toBe("API");
        });

        const before = tabRenders.count;
        await pickSearchSource(5, "Internal searches only");
        await waitFor(() => {
            expect(indexersOf(harness)[5].enabledForSearchSource).toBe(
                "INTERNAL",
            );
        });
        await act(async () => {});

        // Without the `compute` projection on the tab's `useWatch`, React Hook
        // Form hands back the whole array — a fresh object every signal — and
        // this is non-zero, while every row-level case in this file stays
        // green, because the rows are memoized on props the tab does not
        // change. The projection is what makes the difference observable.
        expect(tabRenders.count - before).toBe(0);
    });

    it("re-renders only the switched row when a state switch is flipped", async () => {
        const harness = renderTab(indexerList(12));

        const switched = screen.getByTestId("config-input-indexers-7-state");
        fireEvent.focus(switched);
        await act(async () => {});

        const before = snapshotRenders();
        fireEvent.click(switched);
        await waitFor(() => {
            expect(indexersOf(harness)[7].state).toBe("DISABLED_USER");
        });
        await act(async () => {});
        const delta = rendersSince(before);

        for (const [name, count] of delta) {
            if (name !== "Indexer 07") {
                expect([name, count]).toEqual([name, 0]);
            }
        }
        expect(delta.get("Indexer 07") ?? 0).toBeGreaterThanOrEqual(1);
        expect(delta.get("Indexer 07") ?? 0).toBeLessThanOrEqual(3);
    });

    it("keeps the frozen order a permutation of live rows while a cell is focused", async () => {
        const harness = renderTab(indexerList(12));

        fireEvent.click(screen.getByTestId("config-indexers-sort-priority"));
        const ascending = rowNames();
        expect(ascending[0]).toBe("Indexer 00");
        expect(ascending[11]).toBe("Indexer 11");

        const edited = screen.getByTestId("config-input-indexers-0-score");
        fireEvent.focus(edited);
        fireEvent.change(edited, {target: {value: "99"}});
        await waitFor(() => {
            expect(indexersOf(harness)[0].score).toBe(99);
        });
        // Not a `waitFor`: the claim is that the order did *not* move, which is
        // already true on the first synchronous check and would pass vacuously.
        await act(async () => {});
        expect(rowNames()).toEqual(ascending);

        fireEvent.blur(edited);
        await waitFor(() => {
            expect(rowNames()[11]).toBe("Indexer 00");
        });
    });

    it("shows the value another row's edit wrote, with no stale cell", async () => {
        const harness = renderTab(indexerList(12));

        const edited = screen.getByTestId("config-input-indexers-3-score");
        fireEvent.change(edited, {target: {value: "42"}});
        await waitFor(() => {
            expect(indexersOf(harness)[3].score).toBe(42);
        });

        // Every other row still paints its own, unchanged, values.
        expect(screen.getByTestId("config-input-indexers-4-score")).toHaveValue(
            4,
        );
        expect(rowNames()).toHaveLength(12);

        // And a write that goes through the whole array still reaches every
        // memoized row.
        fireEvent.click(screen.getByTestId("config-indexers-disable-shown"));
        await waitFor(() => {
            expect(
                indexersOf(harness).every(
                    (entry) => entry.state === "DISABLED_USER",
                ),
            ).toBe(true);
        });
        expect(
            within(screen.getByTestId("config-indexer-entry-9")).getByText(
                "Disabled by user",
            ),
        ).toBeVisible();
    });
});
