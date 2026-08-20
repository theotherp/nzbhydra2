import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {useEffect} from "react";
import {FormProvider, useForm, type UseFormReturn} from "react-hook-form";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {ShowAdvancedContext} from "../advancedFields";
import {
    NOTIFICATION_EVENTS,
    type NotificationEntryValues,
} from "./notificationEvents";
import {NotificationsConfigTab} from "./NotificationsConfigTab";

const ENTRIES = "notificationConfig-entries";

const baseConfig: ConfigValues = {
    notificationConfig: {
        appriseType: "NONE",
        appriseApiUrl: "http://apprise.local/notify/hydra",
        appriseCliPath: "/usr/bin/apprise",
        displayNotifications: false,
        displayNotificationsMax: 5,
        filterOuts: ["noisy"],
        indexerDownloadLimitWarningThreshold: 10,
        indexerHitLimitWarningThreshold: 10,
        entries: [],
    },
};

function configWithEntries(entries: NotificationEntryValues[]): ConfigValues {
    return {
        notificationConfig: {
            ...(baseConfig.notificationConfig as Record<string, unknown>),
            entries,
        },
    };
}

type Harness = {form: UseFormReturn<ConfigValues>};

function renderNotifications({
    fetchMock = vi.fn<typeof fetch>(() => {
        throw new Error("no request expected");
    }),
    values = baseConfig,
}: {
    fetchMock?: ReturnType<typeof vi.fn>;
    values?: ConfigValues;
} = {}): Harness {
    const harness = {} as Harness;
    const transport = new ApiTransport(
        "/",
        fetchMock as unknown as typeof fetch,
    );
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    function Host() {
        const form = useForm<ConfigValues>({
            defaultValues: structuredClone(values),
            shouldUnregister: false,
        });
        useEffect(() => {
            harness.form = form;
        }, [form]);
        return (
            <ThemeProvider theme={createHydraTheme("dark")}>
                <QueryClientProvider client={queryClient}>
                    <ToastProvider>
                        <FormProvider {...form}>
                            {/* The tab has no advanced-gated field; the
                                provider only satisfies `useShowAdvanced`. */}
                            <ShowAdvancedContext.Provider value={true}>
                                <NotificationsConfigTab transport={transport} />
                            </ShowAdvancedContext.Provider>
                        </FormProvider>
                    </ToastProvider>
                </QueryClientProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

function notificationValues(harness: Harness): Record<string, unknown> {
    return harness.form.getValues().notificationConfig as Record<
        string,
        unknown
    >;
}

function entriesOf(harness: Harness): NotificationEntryValues[] {
    return notificationValues(harness).entries as NotificationEntryValues[];
}

async function addEntry(eventType: string): Promise<void> {
    fireEvent.click(screen.getByTestId(`config-repeat-add-${ENTRIES}`));
    fireEvent.click(
        await screen.findByTestId(
            `config-repeat-add-option-${ENTRIES}-${eventType}`,
        ),
    );
}

afterEach(cleanup);

describe("F-CONFIG-NOTIFICATIONS main fieldset", () => {
    it("should render the intro help and the always-visible main fields", () => {
        renderNotifications();

        expect(screen.getByTestId("config-notifications-help")).toBeVisible();
        expect(screen.getByTestId("config-fieldset-main")).toBeVisible();
        expect(
            screen.getByTestId("config-setting-notificationConfig-appriseType"),
        ).toBeVisible();
        expect(
            screen.getByTestId(
                "config-setting-notificationConfig-displayNotifications",
            ),
        ).toBeVisible();
        expect(
            screen.getByTestId(
                "config-setting-notificationConfig-indexerHitLimitWarningThreshold",
            ),
        ).toBeVisible();
        expect(
            screen.getByTestId(
                "config-setting-notificationConfig-indexerDownloadLimitWarningThreshold",
            ),
        ).toBeVisible();
        expect(
            screen.getByTestId("config-fieldset-notifications"),
        ).toBeVisible();
    });

    it("should hide both Apprise transport fields while the type is None", () => {
        renderNotifications();

        expect(
            screen.queryByTestId(
                "config-setting-notificationConfig-appriseApiUrl",
            ),
        ).toBeNull();
        expect(
            screen.queryByTestId(
                "config-setting-notificationConfig-appriseCliPath",
            ),
        ).toBeNull();
    });

    it("should show only the API URL for the API transport", () => {
        renderNotifications({
            values: {
                notificationConfig: {
                    ...(baseConfig.notificationConfig as Record<
                        string,
                        unknown
                    >),
                    appriseType: "API",
                },
            },
        });

        expect(
            screen.getByTestId("config-input-notificationConfig-appriseApiUrl"),
        ).toHaveValue("http://apprise.local/notify/hydra");
        expect(
            screen.queryByTestId(
                "config-setting-notificationConfig-appriseCliPath",
            ),
        ).toBeNull();
    });

    it("should show only the CLI runnable for the CLI transport", () => {
        renderNotifications({
            values: {
                notificationConfig: {
                    ...(baseConfig.notificationConfig as Record<
                        string,
                        unknown
                    >),
                    appriseType: "CLI",
                },
            },
        });

        expect(
            screen.getByTestId(
                "config-input-notificationConfig-appriseCliPath",
            ),
        ).toHaveValue("/usr/bin/apprise");
        expect(
            screen.queryByTestId(
                "config-setting-notificationConfig-appriseApiUrl",
            ),
        ).toBeNull();
    });

    it("should keep a hidden transport value when the Apprise type changes", () => {
        const harness = renderNotifications({
            values: {
                notificationConfig: {
                    ...(baseConfig.notificationConfig as Record<
                        string,
                        unknown
                    >),
                    appriseType: "API",
                },
            },
        });

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Apprise type"}),
        );
        fireEvent.click(screen.getByRole("option", {name: "None"}));

        expect(
            screen.queryByTestId(
                "config-setting-notificationConfig-appriseApiUrl",
            ),
        ).toBeNull();
        expect(notificationValues(harness).appriseApiUrl).toBe(
            "http://apprise.local/notify/hydra",
        );
    });

    it("should show the max-notifications and filter fields only while display is on", () => {
        const harness = renderNotifications();

        expect(
            screen.queryByTestId(
                "config-setting-notificationConfig-displayNotificationsMax",
            ),
        ).toBeNull();
        expect(
            screen.queryByTestId(
                "config-setting-notificationConfig-filterOuts",
            ),
        ).toBeNull();

        fireEvent.click(
            screen.getByRole("switch", {name: "Display notifications"}),
        );

        expect(
            screen.getByTestId(
                "config-input-notificationConfig-displayNotificationsMax",
            ),
        ).toHaveValue(5);
        expect(
            screen.getByTestId("config-setting-notificationConfig-filterOuts"),
        ).toBeVisible();

        fireEvent.click(
            screen.getByRole("switch", {name: "Display notifications"}),
        );

        // Hidden again, and the values behind the hidden rows survived.
        expect(
            screen.queryByTestId(
                "config-setting-notificationConfig-filterOuts",
            ),
        ).toBeNull();
        expect(notificationValues(harness).displayNotificationsMax).toBe(5);
        expect(notificationValues(harness).filterOuts).toEqual(["noisy"]);
    });
});

describe("F-CONFIG-NOTIFICATIONS entries", () => {
    it("should offer every event type in the add menu", async () => {
        renderNotifications();

        fireEvent.click(screen.getByTestId(`config-repeat-add-${ENTRIES}`));

        for (const event of NOTIFICATION_EVENTS) {
            expect(
                await screen.findByTestId(
                    `config-repeat-add-option-${ENTRIES}-${event.eventType}`,
                ),
                event.eventType,
            ).toBeVisible();
        }
        expect(
            screen.getAllByTestId(/^config-repeat-add-option-/),
        ).toHaveLength(NOTIFICATION_EVENTS.length);
    });

    it("should seed an added entry from its own event type, for every event type", async () => {
        const harness = renderNotifications();
        expect(harness.form.formState.isDirty).toBe(false);

        for (const event of NOTIFICATION_EVENTS) {
            await addEntry(event.eventType);
        }

        const entries = entriesOf(harness);
        expect(entries).toHaveLength(NOTIFICATION_EVENTS.length);
        NOTIFICATION_EVENTS.forEach((event, index) => {
            expect(entries[index], event.eventType).toEqual({
                eventType: event.eventType,
                appriseUrls: null,
                titleTemplate: event.titleTemplate,
                bodyTemplate: event.bodyTemplate,
                messageType: event.messageType,
            });
            const entry = screen.getByTestId(
                `config-repeat-entry-${ENTRIES}-${index}`,
            );
            expect(
                within(entry).getByTestId(
                    `config-input-${ENTRIES}-${index}-bodyTemplate`,
                ),
                event.eventType,
            ).toHaveValue(event.bodyTemplate);
            expect(
                screen.getByRole("heading", {level: 3, name: event.label}),
            ).toBeVisible();
        });
        expect(harness.form.formState.isDirty).toBe(true);
    });

    it("should show each entry's own template help under its template fields", async () => {
        renderNotifications();

        await addEntry("AUTH_FAILURE");
        await addEntry("UPDATE_INSTALLED");

        const first = screen.getByTestId(`config-repeat-entry-${ENTRIES}-0`);
        const second = screen.getByTestId(`config-repeat-entry-${ENTRIES}-1`);
        expect(
            within(first).getAllByText(
                "Available variables: $username$, $ip$.",
            ),
        ).toHaveLength(2);
        expect(
            within(second).getAllByText("Available variables: $version$."),
        ).toHaveLength(2);
        expect(
            within(second).queryByText(
                "Available variables: $username$, $ip$.",
            ),
        ).toBeNull();
    });

    it("should require a body template", async () => {
        const harness = renderNotifications();

        await addEntry("AUTH_FAILURE");
        fireEvent.change(
            screen.getByTestId(`config-input-${ENTRIES}-0-bodyTemplate`),
            {target: {value: ""}},
        );

        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId(`config-error-${ENTRIES}-0-bodyTemplate`),
        ).toBeVisible();
    });

    it("should remove an entry, mark the form dirty, and keep the order of the rest", () => {
        const harness = renderNotifications({
            values: configWithEntries([
                entryFor("AUTH_FAILURE", "json://one"),
                entryFor("UPDATE_INSTALLED", "json://two"),
                entryFor("INDEXER_DISABLED", "json://three"),
            ]),
        });
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(
            screen.getByTestId(`config-repeat-remove-${ENTRIES}-1`),
        );

        expect(entriesOf(harness).map((entry) => entry.eventType)).toEqual([
            "AUTH_FAILURE",
            "INDEXER_DISABLED",
        ]);
        expect(entriesOf(harness).map((entry) => entry.appriseUrls)).toEqual([
            "json://one",
            "json://three",
        ]);
        expect(harness.form.formState.isDirty).toBe(true);
        expect(
            screen.queryByTestId(`config-repeat-entry-${ENTRIES}-2`),
        ).toBeNull();
    });

    it("should keep an entry whose event type this build does not know, and say so", () => {
        const harness = renderNotifications({
            values: configWithEntries([
                {
                    eventType: "SOME_FUTURE_EVENT",
                    appriseUrls: "json://future",
                    titleTemplate: "Future",
                    bodyTemplate: "Body",
                    messageType: "INFO",
                },
            ]),
        });

        expect(
            screen.getByTestId("config-notification-unknown-event-0"),
        ).toHaveTextContent("SOME_FUTURE_EVENT");
        expect(
            screen.getByRole("heading", {level: 3, name: "SOME_FUTURE_EVENT"}),
        ).toBeVisible();
        expect(
            screen.getByTestId(`config-input-${ENTRIES}-0-appriseUrls`),
        ).toHaveValue("json://future");
        expect(entriesOf(harness)[0].eventType).toBe("SOME_FUTURE_EVENT");
        // Nothing to test-send: the server would reject the unknown constant.
        expect(
            screen.getByTestId(`config-notification-test-${ENTRIES}-0`),
        ).toBeDisabled();
    });
});

describe("F-CONFIG-NOTIFICATIONS test action", () => {
    it("should send the entry's event type and report success without dirtying the form", async () => {
        const fetchMock = vi.fn<typeof fetch>(
            async () => new Response(null, {status: 200}),
        );
        const harness = renderNotifications({
            fetchMock,
            values: configWithEntries([
                entryFor("INDEXER_DISABLED", "json://one"),
            ]),
        });
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(
            screen.getByTestId(`config-notification-test-${ENTRIES}-0`),
        );

        expect(
            await screen.findByText("Test notification sent."),
        ).toBeVisible();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0][0])).toContain(
            "internalapi/notifications/test/INDEXER_DISABLED",
        );
        expect(harness.form.formState.isDirty).toBe(false);
        expect(entriesOf(harness)[0]).toEqual(
            entryFor("INDEXER_DISABLED", "json://one"),
        );
    });

    it("should report a failed test send without dirtying the form", async () => {
        // `NotificationsWeb` has no registered event for
        // EXTERNAL_TOOL_CONFIGURATION, so this is the real failure shape.
        const fetchMock = vi.fn<typeof fetch>(
            async () => new Response("failed", {status: 500}),
        );
        const harness = renderNotifications({
            fetchMock,
            values: configWithEntries([
                entryFor("EXTERNAL_TOOL_CONFIGURATION", "json://one"),
            ]),
        });

        fireEvent.click(
            screen.getByTestId(`config-notification-test-${ENTRIES}-0`),
        );

        expect(
            await screen.findByText("Unable to send the test notification."),
        ).toBeVisible();
        expect(harness.form.formState.isDirty).toBe(false);
        await waitFor(() =>
            expect(
                screen.getByTestId(`config-notification-test-${ENTRIES}-0`),
            ).toBeEnabled(),
        );
    });

    it("should carry legacy's save-first guidance next to the action", () => {
        renderNotifications({
            values: configWithEntries([entryFor("AUTH_FAILURE", null)]),
        });

        expect(
            screen.getByText(
                "Send a test notification. You need to save the config first.",
            ),
        ).toBeVisible();
    });
});

function entryFor(
    eventType: string,
    appriseUrls: string | null,
): NotificationEntryValues {
    const event = NOTIFICATION_EVENTS.find(
        (candidate) => candidate.eventType === eventType,
    );
    return {
        eventType,
        appriseUrls,
        titleTemplate: event?.titleTemplate ?? "Title",
        bodyTemplate: event?.bodyTemplate ?? "Body",
        messageType: event?.messageType ?? "INFO",
    };
}
