import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {ThemeProvider} from "@mui/material/styles";
import {afterEach, describe, expect, it, vi} from "vitest";

import {createHydraTheme} from "../../../app/theme";
import {ChartCard} from "./ChartCard";

/**
 * jsdom has no `IntersectionObserver`, so an unstubbed suite exercises the
 * eager fallback -- which is one of the two branches this card must keep. The
 * deferred branch is driven by installing this stub, which records every
 * observed element and lets a test decide when the card "reaches" the
 * viewport.
 */
function installObserverStub() {
    const instances: {
        callback: IntersectionObserverCallback;
        observed: Element[];
        disconnected: boolean;
    }[] = [];
    class Stub {
        callback: IntersectionObserverCallback;
        constructor(callback: IntersectionObserverCallback) {
            this.callback = callback;
            instances.push({callback, observed: [], disconnected: false});
        }
        observe(element: Element) {
            instances[instances.length - 1].observed.push(element);
        }
        unobserve() {}
        disconnect() {
            const entry = instances.find(
                (candidate) => candidate.callback === this.callback,
            );
            if (entry) entry.disconnected = true;
        }
        takeRecords() {
            return [];
        }
    }
    vi.stubGlobal("IntersectionObserver", Stub);
    return {
        instances,
        /** Report the observed card as having reached the viewport. */
        intersect() {
            const latest = instances[instances.length - 1];
            act(() => {
                latest.callback(
                    [{isIntersecting: true} as IntersectionObserverEntry],
                    {} as IntersectionObserver,
                );
            });
        },
    };
}

function renderCard() {
    render(
        <ThemeProvider theme={createHydraTheme()}>
            <ChartCard
                chart={<div data-testid="chart-body">chart</div>}
                chartHeight={420}
                table={<div data-testid="table-body">table</div>}
                testId="stats-chart-example"
                title="Example"
            />
        </ThemeProvider>,
    );
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("ChartCard", () => {
    it("mounts the chart eagerly where IntersectionObserver is absent", () => {
        expect(globalThis.IntersectionObserver).toBeUndefined();
        renderCard();
        expect(screen.getByTestId("chart-body")).toBeTruthy();
        expect(
            screen.queryByTestId("stats-chart-example-placeholder"),
        ).toBeNull();
    });

    it("holds a placeholder of the chart's own height until the card is reached", () => {
        const observer = installObserverStub();
        renderCard();

        const placeholder = screen.getByTestId(
            "stats-chart-example-placeholder",
        );
        expect(screen.queryByTestId("chart-body")).toBeNull();
        // The reserved slot is the chart's height, so nothing below the card
        // moves when the chart replaces it.
        expect(globalThis.getComputedStyle(placeholder).height).toBe("420px");
        expect(observer.instances[0].observed[0]).toBe(
            screen.getByTestId("stats-chart-example"),
        );

        observer.intersect();
        expect(screen.getByTestId("chart-body")).toBeTruthy();
        expect(
            screen.queryByTestId("stats-chart-example-placeholder"),
        ).toBeNull();
    });

    it("keeps a mounted chart mounted and never gates the table arm", () => {
        const observer = installObserverStub();
        renderCard();
        observer.intersect();

        const toggle = screen.getByRole("button", {name: "View data"});
        expect(toggle.getAttribute("aria-expanded")).toBe("false");
        fireEvent.click(toggle);
        expect(screen.getByTestId("table-body")).toBeTruthy();
        expect(screen.queryByTestId("chart-body")).toBeNull();

        const hide = screen.getByRole("button", {name: "Hide data"});
        expect(hide.getAttribute("aria-expanded")).toBe("true");
        fireEvent.click(hide);
        // Back to the chart with no second visibility gate.
        expect(screen.getByTestId("chart-body")).toBeTruthy();
        expect(
            screen.queryByTestId("stats-chart-example-placeholder"),
        ).toBeNull();
    });

    it("does not mount the chart of a card that is showing its table", () => {
        const observer = installObserverStub();
        renderCard();
        fireEvent.click(screen.getByRole("button", {name: "View data"}));
        expect(screen.getByTestId("table-body")).toBeTruthy();

        // Only the pre-toggle observer exists; the table arm asks for none.
        expect(observer.instances).toHaveLength(1);
        expect(observer.instances[0].disconnected).toBe(true);

        fireEvent.click(screen.getByRole("button", {name: "Hide data"}));
        expect(screen.getByTestId("chart-body")).toBeTruthy();
    });
});
