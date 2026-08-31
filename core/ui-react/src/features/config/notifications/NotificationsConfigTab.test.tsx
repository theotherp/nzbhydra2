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
            <ThemeProvider theme={createHydraTheme("grey")}>
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

function expandEntry(index: number): void {
    fireEvent.click(
        screen.getByTestId(`config-repeat-toggle-${ENTRIES}-${index}`),
    );
}

function templateInput(
    index: number,
    field: "bodyTemplate" | "titleTemplate",
): HTMLTextAreaElement {
    return screen.getByTestId(
        `config-input-${ENTRIES}-${index}-${field}`,
    ) as HTMLTextAreaElement;
}

/** Put the caret where an admin would have put it, then insert a chip. */
function insertVariableAt(
    index: number,
    field: "bodyTemplate" | "titleTemplate",
    name: string,
    caret?: {end: number; start: number},
): void {
    const input = templateInput(index, field);
    fireEvent.focus(input);
    if (caret !== undefined) {
        input.setSelectionRange(caret.start, caret.end);
    }
    fireEvent.click(
        screen.getByTestId(`config-notification-variable-${index}-${name}`),
    );
}

function previewText(index: number, part: "body" | "title"): string {
    return (
        screen.getByTestId(`config-notification-preview-${index}-${part}`)
            .textContent ?? ""
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

    // 3568ms under a full-suite run on an idle machine, the second-slowest test
    // in the suite behind SearchWorkspace's selection round trip and the only
    // other one within 2x of vitest's 5000ms default. Not yet observed failing;
    // given the same budget pre-emptively, on the same measurement.
    it(
        "should seed an added entry from its own event type, for every event type",
        {timeout: 30_000},
        async () => {
            // One tab per event rather than eight entries in one tab: the claim is
            // per event, and an accordion carrying a template editor and a preview
            // is expensive enough that the accumulated tree, not the assertions,
            // dominated this test's runtime.
            for (const event of NOTIFICATION_EVENTS) {
                const harness = renderNotifications();
                expect(harness.form.formState.isDirty).toBe(false);

                await addEntry(event.eventType);

                expect(entriesOf(harness), event.eventType).toEqual([
                    {
                        eventType: event.eventType,
                        appriseUrls: null,
                        titleTemplate: event.titleTemplate,
                        bodyTemplate: event.bodyTemplate,
                        messageType: event.messageType,
                    },
                ]);
                const entry = screen.getByTestId(
                    `config-repeat-entry-${ENTRIES}-0`,
                );
                expect(
                    within(entry).getByTestId(
                        `config-input-${ENTRIES}-0-bodyTemplate`,
                    ),
                    event.eventType,
                ).toHaveValue(event.bodyTemplate);
                // The heading is MUI's own `<h3>` around the summary button, so its
                // name is the whole summary (legend + message type), not the legend
                // alone. jsdom is not the proof this is exposed -- it does not
                // implement presentational children, so it would pass just as
                // happily on a heading nested *inside* the button, which no browser
                // exposes; `config-notifications.spec.ts` pins it in Chromium.
                expect(
                    screen.getByRole("heading", {
                        level: 3,
                        name: (name: string) => name.startsWith(event.label),
                    }),
                    event.eventType,
                ).toBeVisible();
                expect(harness.form.formState.isDirty, event.eventType).toBe(
                    true,
                );
                cleanup();
            }
        },
    );

    it("should append each added entry rather than replacing the last", async () => {
        const harness = renderNotifications();

        await addEntry("AUTH_FAILURE");
        await addEntry("UPDATE_INSTALLED");
        await addEntry("AUTH_FAILURE");

        expect(entriesOf(harness).map((entry) => entry.eventType)).toEqual([
            "AUTH_FAILURE",
            "UPDATE_INSTALLED",
            "AUTH_FAILURE",
        ]);
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

        expandEntry(1);
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
            screen.getByRole("heading", {
                level: 3,
                name: (name: string) => name.startsWith("SOME_FUTURE_EVENT"),
            }),
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

describe("F-CONFIG-NOTIFICATIONS entry accordions", () => {
    it("should keep stored entries collapsed and summarize each by event and message type", () => {
        renderNotifications({
            values: configWithEntries([
                entryFor("AUTH_FAILURE", "json://one"),
                entryFor("UPDATE_INSTALLED", "json://two"),
            ]),
        });

        const summary = screen.getByTestId(`config-repeat-toggle-${ENTRIES}-0`);
        expect(summary).toHaveTextContent("Auth failure");
        // The message type is on the summary as text, not as a colour alone.
        expect(summary).toHaveTextContent("Failure");
        expect(
            screen.getByTestId(`config-repeat-toggle-${ENTRIES}-1`),
        ).toHaveTextContent("Success");
        expect(summary).toHaveAttribute("aria-expanded", "false");
        expect(
            screen.getByTestId(`config-setting-${ENTRIES}-0-appriseUrls`),
        ).not.toBeVisible();

        expandEntry(0);

        expect(summary).toHaveAttribute("aria-expanded", "true");
        expect(
            screen.getByTestId(`config-setting-${ENTRIES}-0-appriseUrls`),
        ).toBeVisible();
        // Opening one entry does not close the others' fields out from under a
        // comparison.
        expect(
            screen.getByTestId(`config-repeat-toggle-${ENTRIES}-1`),
        ).toHaveAttribute("aria-expanded", "false");
    });

    it("should expand a newly added entry so its fields are reachable", async () => {
        renderNotifications();

        expect(screen.getByTestId("config-notifications-empty")).toBeVisible();
        await addEntry("UPDATE_INSTALLED");

        expect(screen.queryByTestId("config-notifications-empty")).toBeNull();
        expect(
            screen.getByTestId(`config-repeat-toggle-${ENTRIES}-0`),
        ).toHaveAttribute("aria-expanded", "true");
        expect(
            screen.getByTestId(`config-setting-${ENTRIES}-0-appriseUrls`),
        ).toBeVisible();
    });

    it("should move expansion with the entries when one is removed", () => {
        renderNotifications({
            values: configWithEntries([
                entryFor("AUTH_FAILURE", "json://one"),
                entryFor("UPDATE_INSTALLED", "json://two"),
                entryFor("INDEXER_DISABLED", "json://three"),
            ]),
        });

        expandEntry(0);
        expandEntry(2);
        fireEvent.click(
            screen.getByTestId(`config-repeat-remove-${ENTRIES}-0`),
        );

        // What was entry 2 is entry 1 now, and it is the one still open.
        expect(
            screen.getByTestId(`config-repeat-toggle-${ENTRIES}-0`),
        ).toHaveTextContent("Automatic update installed");
        expect(
            screen.getByTestId(`config-repeat-toggle-${ENTRIES}-0`),
        ).toHaveAttribute("aria-expanded", "false");
        expect(
            screen.getByTestId(`config-repeat-toggle-${ENTRIES}-1`),
        ).toHaveTextContent("Indexer disabled");
        expect(
            screen.getByTestId(`config-repeat-toggle-${ENTRIES}-1`),
        ).toHaveAttribute("aria-expanded", "true");
    });

    it("should summarize an entry whose event type this build does not know", () => {
        renderNotifications({
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

        const summary = screen.getByTestId(`config-repeat-toggle-${ENTRIES}-0`);
        expect(summary).toHaveTextContent("SOME_FUTURE_EVENT");
        expect(summary).toHaveTextContent("Info");
    });
});

describe("F-CONFIG-NOTIFICATIONS variable chips", () => {
    it("should offer one chip per variable the backend event provides", async () => {
        renderNotifications();

        await addEntry("RESULT_DOWNLOAD");

        const event = NOTIFICATION_EVENTS.find(
            (candidate) => candidate.eventType === "RESULT_DOWNLOAD",
        );
        expect(event?.variables).toBeDefined();
        for (const name of event?.variables ?? []) {
            expect(
                screen.getByTestId(`config-notification-variable-0-${name}`),
                name,
            ).toHaveTextContent(`$${name}$`);
        }
        expect(
            screen.getAllByTestId(/^config-notification-variable-0-/),
        ).toHaveLength(event?.variables.length ?? 0);
        // The help prose writes `$title` unclosed; the chip must not.
        expect(
            screen.getByTestId("config-notification-variable-0-title"),
        ).toHaveTextContent("$title$");
    });

    it("should insert a token at the caret in the middle of existing text", async () => {
        const harness = renderNotifications({
            values: configWithEntries([
                entryFor("UPDATE_INSTALLED", "json://one"),
            ]),
        });
        // Read once up front so React Hook Form's formState proxy subscribes.
        expect(harness.form.formState.isDirty).toBe(false);
        expandEntry(0);
        fireEvent.change(templateInput(0, "titleTemplate"), {
            target: {value: "Updated to  today"},
        });
        insertVariableAt(0, "titleTemplate", "version", {end: 11, start: 11});

        expect(templateInput(0, "titleTemplate")).toHaveValue(
            "Updated to $version$ today",
        );
        expect(entriesOf(harness)[0].titleTemplate).toBe(
            "Updated to $version$ today",
        );
        expect(harness.form.formState.isDirty).toBe(true);
        expect(templateInput(0, "titleTemplate").selectionStart).toBe(20);
    });

    it("should insert into an empty field the admin has focused", async () => {
        const harness = renderNotifications();

        await addEntry("UPDATE_INSTALLED");
        fireEvent.change(templateInput(0, "bodyTemplate"), {
            target: {value: ""},
        });
        insertVariableAt(0, "bodyTemplate", "version", {end: 0, start: 0});

        expect(entriesOf(harness)[0].bodyTemplate).toBe("$version$");
    });

    it("should target the field the admin last focused, and say which", async () => {
        const harness = renderNotifications();

        await addEntry("UPDATE_INSTALLED");
        // The caption names the default target before either field is touched.
        expect(
            screen.getByText("Insert a variable into the Body template field:"),
        ).toBeVisible();

        fireEvent.focus(templateInput(0, "titleTemplate"));
        expect(
            screen.getByText(
                "Insert a variable into the Title template field:",
            ),
        ).toBeVisible();
        fireEvent.click(
            screen.getByTestId("config-notification-variable-0-version"),
        );

        const seeded = NOTIFICATION_EVENTS.find(
            (candidate) => candidate.eventType === "UPDATE_INSTALLED",
        );
        expect(entriesOf(harness)[0].titleTemplate).toBe(
            `${seeded?.titleTemplate ?? ""}$version$`,
        );
        // The body was not touched.
        expect(entriesOf(harness)[0].bodyTemplate).toBe(seeded?.bodyTemplate);
    });

    it("should offer no chips and no preview for an unknown event type", () => {
        renderNotifications({
            values: configWithEntries([
                {
                    eventType: "SOME_FUTURE_EVENT",
                    appriseUrls: "json://future",
                    titleTemplate: "Future $whatever$",
                    bodyTemplate: "Body",
                    messageType: "INFO",
                },
            ]),
        });

        expandEntry(0);

        expect(
            screen.queryAllByTestId(/^config-notification-variable-0-/),
        ).toHaveLength(0);
        expect(
            screen.queryByTestId("config-notification-preview-0"),
        ).toBeNull();
        // Still editable, which is the whole point of keeping the entry.
        expect(templateInput(0, "titleTemplate")).toHaveValue(
            "Future $whatever$",
        );
    });
});

describe("F-CONFIG-NOTIFICATIONS template preview", () => {
    it("should render the seeded template with the event's sample values", async () => {
        renderNotifications();

        await addEntry("INDEXER_DISABLED");

        expect(previewText(0, "title")).toBe("Indexer disabled");
        expect(previewText(0, "body")).toBe(
            "NZBHydra: Indexer Some indexer was disabled (state: Disabled temporarily). Message:\nSome message.",
        );
    });

    it("should follow the admin's typing, leaving unknown tokens standing", async () => {
        renderNotifications();

        await addEntry("UPDATE_INSTALLED");
        fireEvent.change(templateInput(0, "bodyTemplate"), {
            target: {value: "Now on $version$, was $vorsion$"},
        });

        // `NotificationHandler.fillTemplate` replaces only the variables the
        // event provides, so the typo is delivered verbatim and the preview
        // has to show that rather than blanking it.
        expect(previewText(0, "body")).toBe("Now on v1.2.3, was $vorsion$");
    });

    it("should say what an entry with no title template will send", async () => {
        renderNotifications();

        await addEntry("UPDATE_INSTALLED");
        fireEvent.change(templateInput(0, "titleTemplate"), {
            target: {value: ""},
        });
        fireEvent.change(templateInput(0, "bodyTemplate"), {
            target: {value: ""},
        });

        expect(previewText(0, "title")).toBe(
            "No title template — the notification is sent untitled.",
        );
        expect(previewText(0, "body")).toBe(
            "No body template — this entry cannot be saved.",
        );
    });

    it("should show a chip insertion immediately", async () => {
        renderNotifications();

        await addEntry("AUTH_FAILURE");
        fireEvent.change(templateInput(0, "bodyTemplate"), {
            target: {value: "Failed login: "},
        });
        insertVariableAt(0, "bodyTemplate", "username", {end: 14, start: 14});

        expect(previewText(0, "body")).toBe("Failed login: Some username");
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

        expandEntry(0);
        fireEvent.click(
            screen.getByTestId(`config-notification-test-${ENTRIES}-0`),
        );

        const result = await screen.findByTestId(
            "config-notification-test-result-0",
        );
        expect(result).toHaveTextContent("Test notification sent.");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0][0])).toContain(
            "internalapi/notifications/test/INDEXER_DISABLED",
        );
        expect(harness.form.formState.isDirty).toBe(false);
        expect(entriesOf(harness)[0]).toEqual(
            entryFor("INDEXER_DISABLED", "json://one"),
        );
    });

    it("should report a failed test send inline without dirtying the form", async () => {
        // Since FM-086 every event type is registered, so the failure the
        // admin actually hits is the transport one: Apprise unreachable or the
        // configured URLs rejected. The endpoint answers with a status only.
        const fetchMock = vi.fn<typeof fetch>(
            async () => new Response("failed", {status: 500}),
        );
        const harness = renderNotifications({
            fetchMock,
            values: configWithEntries([
                entryFor("EXTERNAL_TOOL_CONFIGURATION", "json://one"),
            ]),
        });

        expandEntry(0);
        fireEvent.click(
            screen.getByTestId(`config-notification-test-${ENTRIES}-0`),
        );

        const result = await screen.findByTestId(
            "config-notification-test-result-0",
        );
        expect(result).toHaveTextContent(
            "Unable to send the test notification.",
        );
        // Not carried by colour alone: the wording says what happened.
        expect(harness.form.formState.isDirty).toBe(false);
        await waitFor(() =>
            expect(
                screen.getByTestId(`config-notification-test-${ENTRIES}-0`),
            ).toBeEnabled(),
        );
    });

    it("should clear the inline result once the entry's fields change", async () => {
        const fetchMock = vi.fn<typeof fetch>(
            async () => new Response(null, {status: 200}),
        );
        renderNotifications({
            fetchMock,
            values: configWithEntries([
                entryFor("UPDATE_INSTALLED", "json://one"),
            ]),
        });

        expandEntry(0);
        fireEvent.click(
            screen.getByTestId(`config-notification-test-${ENTRIES}-0`),
        );
        expect(
            await screen.findByTestId("config-notification-test-result-0"),
        ).toBeVisible();

        // The server sends the *saved* entry, so a success that stayed on
        // screen while the admin edited would claim something untrue.
        fireEvent.change(templateInput(0, "bodyTemplate"), {
            target: {value: "Changed"},
        });

        await waitFor(() =>
            expect(
                screen.queryByTestId("config-notification-test-result-0"),
            ).toBeNull(),
        );
    });

    it("should report each entry's own result rather than one shared banner", async () => {
        const fetchMock = vi.fn<typeof fetch>(async (input) =>
            String(input).includes("UPDATE_INSTALLED")
                ? new Response(null, {status: 200})
                : new Response("failed", {status: 500}),
        );
        renderNotifications({
            fetchMock,
            values: configWithEntries([
                entryFor("UPDATE_INSTALLED", "json://one"),
                entryFor("AUTH_FAILURE", "json://two"),
            ]),
        });

        expandEntry(0);
        expandEntry(1);
        fireEvent.click(
            screen.getByTestId(`config-notification-test-${ENTRIES}-0`),
        );
        fireEvent.click(
            screen.getByTestId(`config-notification-test-${ENTRIES}-1`),
        );

        expect(
            await screen.findByTestId("config-notification-test-result-0"),
        ).toHaveTextContent("Test notification sent.");
        expect(
            await screen.findByTestId("config-notification-test-result-1"),
        ).toHaveTextContent("Unable to send the test notification.");
    });

    it("should carry legacy's save-first guidance next to the action", () => {
        renderNotifications({
            values: configWithEntries([entryFor("AUTH_FAILURE", null)]),
        });

        expandEntry(0);
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
