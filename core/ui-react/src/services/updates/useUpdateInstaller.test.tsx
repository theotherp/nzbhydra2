import {act, renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import {getUpdateMessages, installUpdate} from "../../api/system/updates";
import {ToastProvider} from "../../components/toasts/ToastProvider";
import {useUpdateInstaller} from "./useUpdateInstaller";

vi.mock("../../api/system/updates", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("../../api/system/updates")>();
    return {
        ...actual,
        getUpdateMessages: vi.fn(),
        installUpdate: vi.fn(),
    };
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe("useUpdateInstaller", () => {
    it("should stop polling for messages when the component unmounts mid-install", async () => {
        vi.useFakeTimers();
        // Never resolves: keeps the install "in flight" so the poll interval
        // is still running when the hook unmounts.
        vi.mocked(installUpdate).mockReturnValue(new Promise(() => {}));
        vi.mocked(getUpdateMessages).mockResolvedValue(["line"]);

        const transport = new ApiTransport("/hydra/", vi.fn());
        const {result, unmount} = renderHook(
            () => useUpdateInstaller(transport),
            {
                wrapper: ({children}) => (
                    <ToastProvider>{children}</ToastProvider>
                ),
            },
        );

        act(() => {
            void result.current.install("1.2.3");
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });
        const callsBeforeUnmount =
            vi.mocked(getUpdateMessages).mock.calls.length;
        expect(callsBeforeUnmount).toBeGreaterThan(0);

        unmount();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(vi.mocked(getUpdateMessages).mock.calls.length).toBe(
            callsBeforeUnmount,
        );
    });
});
