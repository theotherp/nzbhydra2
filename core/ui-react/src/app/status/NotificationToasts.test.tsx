import {act, cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {
    LiveNotification,
    NotificationsLiveTransport,
} from "../../api/live/notifications";
import {SafeConfigContext, type BootstrapData} from "../../bootstrap";
import {NotificationToasts} from "./NotificationToasts";

vi.mock("@tanstack/react-router", () => ({
    Link: ({
        to,
        children,
        ...rest
    }: {
        to: string;
        children?: React.ReactNode;
    }) => (
        <a {...rest} href={to}>
            {children}
        </a>
    ),
}));

const enabledConfig = {
    notificationConfig: {
        displayNotifications: true,
        displayNotificationsMax: 2,
    },
};

const bootstrap = {
    adminRestricted: false,
    authConfigured: false,
    authType: null,
    baseUrl: "/hydra/",
    maySeeAdmin: true,
    maySeeDetailsDl: true,
    maySeeSearch: true,
    maySeeStats: true,
    safeConfig: enabledConfig,
    searchRestricted: false,
    serverTimeZone: null,
    showIndexerSelection: false,
    showLogout: false,
    statsRestricted: false,
    username: null,
} satisfies BootstrapData;

function notification(
    overrides: Partial<LiveNotification> = {},
): LiveNotification {
    return {
        body: "Body",
        id: 1,
        messageType: "INFO",
        title: null,
        ...overrides,
    };
}

function fakeLiveTransport(options: {fail?: boolean} = {}) {
    const close = vi.fn();
    const acknowledge = vi.fn();
    let deliver:
        | ((
              notifications: LiveNotification[],
              ack: (id: number) => void,
          ) => void)
        | undefined;
    const subscribeNotifications = vi.fn(
        async (
            onNotifications: (
                notifications: LiveNotification[],
                ack: (id: number) => void,
            ) => void,
        ) => {
            if (options.fail === true) {
                throw new Error("Live progress connection failed");
            }
            deliver = onNotifications;
            return {close};
        },
    );
    return {
        acknowledge,
        close,
        deliver: (notifications: LiveNotification[]) =>
            act(() => {
                deliver?.(notifications, acknowledge);
            }),
        liveTransport: {
            subscribeNotifications,
        } satisfies NotificationsLiveTransport,
        subscribeNotifications,
    };
}

function renderToasts(
    fake: ReturnType<typeof fakeLiveTransport>,
    overrides: {
        maySeeAdmin?: boolean;
        safeConfig?: Record<string, unknown> | null;
    } = {},
) {
    return render(
        <SafeConfigContext.Provider
            value={overrides.safeConfig ?? enabledConfig}
        >
            <NotificationToasts
                bootstrap={{
                    ...bootstrap,
                    maySeeAdmin: overrides.maySeeAdmin ?? true,
                }}
                liveTransport={fake.liveTransport}
            />
        </SafeConfigContext.Provider>,
    );
}

async function waitForSubscription(fake: ReturnType<typeof fakeLiveTransport>) {
    await vi.waitFor(() =>
        expect(fake.subscribeNotifications).toHaveBeenCalled(),
    );
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("NotificationToasts", () => {
    it("should not subscribe while display notifications are switched off", () => {
        const fake = fakeLiveTransport();
        renderToasts(fake, {
            safeConfig: {
                notificationConfig: {
                    displayNotifications: false,
                    displayNotificationsMax: 2,
                },
            },
        });

        expect(fake.subscribeNotifications).not.toHaveBeenCalled();
    });

    it("should not subscribe for a session that may not see the admin area", () => {
        const fake = fakeLiveTransport();
        renderToasts(fake, {maySeeAdmin: false});

        expect(fake.subscribeNotifications).not.toHaveBeenCalled();
    });

    it("should map every message type to its toast severity", async () => {
        const fake = fakeLiveTransport();
        renderToasts(fake, {
            safeConfig: {
                notificationConfig: {
                    displayNotifications: true,
                    displayNotificationsMax: 10,
                },
            },
        });
        await waitForSubscription(fake);

        fake.deliver([
            notification({body: "Info body", id: 1, messageType: "INFO"}),
            notification({body: "Done", id: 2, messageType: "SUCCESS"}),
            notification({body: "Careful", id: 3, messageType: "WARNING"}),
            notification({body: "Broken", id: 4, messageType: "FAILURE"}),
        ]);

        const alerts = screen.getAllByRole("alert");
        expect(alerts).toHaveLength(4);
        expect(alerts[0]).toHaveTextContent("Info body");
        expect(alerts[0]?.className).toContain("colorInfo");
        expect(alerts[1]?.className).toContain("colorSuccess");
        expect(alerts[2]?.className).toContain("colorWarning");
        expect(alerts[3]?.className).toContain("colorError");
        expect(fake.acknowledge.mock.calls.flat()).toEqual([1, 2, 3, 4]);
    });

    it("should render a body as text with newlines as line breaks, never as HTML", async () => {
        const fake = fakeLiveTransport();
        renderToasts(fake);
        await waitForSubscription(fake);

        fake.deliver([
            notification({
                body: "First line\nSecond <b>line</b>",
                id: 5,
            }),
        ]);

        const alert = screen.getByRole("alert");
        expect(alert.querySelector("br")).not.toBeNull();
        expect(alert.querySelector("b")).toBeNull();
        expect(alert).toHaveTextContent("Second <b>line</b>");
    });

    it("should replace an oversized batch with one pile-up toast linking the history", async () => {
        const fake = fakeLiveTransport();
        renderToasts(fake);
        await waitForSubscription(fake);

        fake.deliver([
            notification({id: 1}),
            notification({id: 2}),
            notification({id: 3}),
        ]);

        const alerts = screen.getAllByRole("alert");
        expect(alerts).toHaveLength(1);
        expect(alerts[0]).toHaveTextContent("3 notifications have piled up.");
        expect(
            screen.getByRole("link", {
                name: "Go to the notification history to view them.",
            }),
        ).toHaveAttribute("href", "/stats/notifications");
        expect(fake.acknowledge.mock.calls.flat()).toEqual([1, 2, 3]);
    });

    it("should skip acknowledging a notification without an id", async () => {
        const fake = fakeLiveTransport();
        renderToasts(fake);
        await waitForSubscription(fake);

        fake.deliver([notification({id: undefined}), notification({id: 6})]);

        expect(fake.acknowledge.mock.calls.flat()).toEqual([6]);
    });

    it("should withdraw an ordinary toast on its own and keep the pile-up notice", async () => {
        vi.useFakeTimers({shouldAdvanceTime: true});
        const fake = fakeLiveTransport();
        renderToasts(fake);
        await waitForSubscription(fake);

        fake.deliver([notification({body: "Transient", id: 1})]);
        expect(screen.getAllByRole("alert")).toHaveLength(1);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5_000);
        });
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();

        fake.deliver([
            notification({id: 1}),
            notification({id: 2}),
            notification({id: 3}),
        ]);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(30_000);
        });
        // Legacy's `disableCountDown` for the pile-up notice.
        expect(screen.getByRole("alert")).toHaveTextContent("piled up");
    });

    it("should close the subscription on unmount", async () => {
        const fake = fakeLiveTransport();
        const view = renderToasts(fake);
        await waitForSubscription(fake);

        view.unmount();
        await vi.waitFor(() => expect(fake.close).toHaveBeenCalledOnce());
    });

    it("should stay quiet when the connection never comes up", async () => {
        const fake = fakeLiveTransport({fail: true});
        renderToasts(fake);
        await waitForSubscription(fake);

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
