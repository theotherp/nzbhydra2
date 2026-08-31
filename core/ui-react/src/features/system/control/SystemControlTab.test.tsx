import {ThemeProvider} from "@mui/material";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../../api/transport";
import {shutdownInstance} from "../../../api/system/control";
import {createHydraTheme} from "../../../app/theme";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {SystemControlTab} from "./SystemControlTab";

vi.mock("../../../api/system/control", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("../../../api/system/control")>();
    return {...actual, shutdownInstance: vi.fn(actual.shutdownInstance)};
});

type Backend = {
    fetch: ReturnType<typeof vi.fn<typeof fetch>>;
    requests: string[];
};

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
        status,
    });
}

function createBackend(
    answer: (path: string) => Response = () => jsonResponse({successful: true}),
): Backend {
    const backend: Backend = {fetch: vi.fn<typeof fetch>(), requests: []};
    backend.fetch.mockImplementation(async (input: RequestInfo | URL) => {
        const path = new URL(String(input)).pathname;
        backend.requests.push(path);
        return answer(path);
    });
    return backend;
}

function renderControlTab(backend: Backend) {
    vi.stubGlobal("fetch", backend.fetch);
    render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <ToastProvider>
                <SystemControlTab
                    transport={new ApiTransport("/hydra/", backend.fetch)}
                />
            </ToastProvider>
        </ThemeProvider>,
    );
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("SystemControlTab", () => {
    it("should shut the instance down and report legacy's success wording", async () => {
        const backend = createBackend();
        renderControlTab(backend);

        fireEvent.click(screen.getByTestId("system-shutdown"));

        expect(
            await screen.findByText("Shutdown initiated. Cya!"),
        ).toBeVisible();
        expect(backend.requests).toEqual([
            "/hydra/internalapi/control/shutdown",
        ]);
    });

    it("should report an unreachable instance on shutdown", async () => {
        const backend = createBackend();
        backend.fetch.mockRejectedValue(new Error("network down"));
        renderControlTab(backend);

        fireEvent.click(screen.getByTestId("system-shutdown"));

        expect(
            await screen.findByText("Unable to send shutdown command."),
        ).toBeVisible();
    });

    it("should reload the config from file and report the restart caveat", async () => {
        const backend = createBackend();
        renderControlTab(backend);

        fireEvent.click(screen.getByTestId("system-reload-config"));

        expect(
            await screen.findByText(
                "Successfully reloaded config. Some setting may need a restart to take effect.",
            ),
        ).toBeVisible();
        expect(backend.requests).toEqual(["/hydra/internalapi/config/reload"]);
    });

    it("should report the server's reason for a refused config reload", async () => {
        // `ConfigWeb.reloadConfig` answers HTTP 200 with `successful: false`
        // when reading the file throws, so the refusal is only visible in the
        // body.
        const backend = createBackend(() =>
            jsonResponse({
                successful: false,
                message: "nzbhydra.yml is broken",
            }),
        );
        renderControlTab(backend);

        fireEvent.click(screen.getByTestId("system-reload-config"));

        expect(await screen.findByText("nzbhydra.yml is broken")).toBeVisible();
    });

    it("should recover when the action itself rejects, not just when the transport fails", async () => {
        // `requestControlAction` never rejects itself (it swallows every
        // transport failure), so this proves `run()`'s own boundary rather
        // than control.ts's guard.
        vi.mocked(shutdownInstance).mockRejectedValueOnce(
            new Error("unexpected"),
        );
        const backend = createBackend();
        renderControlTab(backend);

        fireEvent.click(screen.getByTestId("system-shutdown"));

        expect(
            await screen.findByText("Unable to send shutdown command."),
        ).toBeVisible();
        expect(screen.getByTestId("system-shutdown")).not.toBeDisabled();
    });

    it("should run the restart coordinator and block the screen while it waits", async () => {
        // Fake timers keep the countdown's first sleep pending: this asserts
        // the command and the dialog, not `C-RESTART-COORDINATOR`'s polling,
        // which has its own tests.
        vi.useFakeTimers();
        const backend = createBackend(() =>
            jsonResponse({successful: true, message: null}),
        );
        renderControlTab(backend);

        fireEvent.click(screen.getByTestId("system-restart"));
        // Enough for the dialog's own transition, far short of the
        // countdown's first 3s ping delay.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(500);
        });

        expect(backend.requests).toEqual([
            "/hydra/internalapi/control/restart",
        ]);
        expect(
            screen.getByTestId("restart-progress-message"),
        ).toHaveTextContent("Will reload page when NZBHydra is back.");
    });
});
