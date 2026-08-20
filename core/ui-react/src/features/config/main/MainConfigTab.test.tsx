import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useEffect} from "react";
import {FormProvider, useForm, type UseFormReturn} from "react-hook-form";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {ShowAdvancedContext} from "../advancedFields";
import {MainConfigTab} from "./MainConfigTab";

/**
 * The 53 fields of `config-fields-service.js:50-735`, in legacy's order and
 * grouping, as the paths they bind to. `advanced` mirrors the effective legacy
 * flag: a field is advanced when its own `templateOptions.advanced` is set or
 * when its fieldset's is (`fieldset-wrapper.html` hides the whole group).
 */
const MAIN_FIELDS: readonly {advanced: boolean; path: string}[] = [
    // Hosting (6)
    {advanced: false, path: "main.host"},
    {advanced: false, path: "main.port"},
    {advanced: true, path: "main.urlBase"},
    {advanced: true, path: "main.ssl"},
    {advanced: false, path: "main.sslKeyStore"},
    {advanced: false, path: "main.sslKeyStorePassword"},
    // Proxy (7), whole fieldset advanced
    {advanced: true, path: "main.proxyType"},
    {advanced: true, path: "main.proxyHost"},
    {advanced: true, path: "main.proxyPort"},
    {advanced: true, path: "main.proxyUsername"},
    {advanced: true, path: "main.proxyPassword"},
    {advanced: true, path: "main.proxyIgnoreLocal"},
    {advanced: true, path: "main.proxyIgnoreDomains"},
    // UI (2)
    {advanced: false, path: "main.theme"},
    {advanced: true, path: "main.indexerSelectionAsCheckboxes"},
    // Security (7)
    {advanced: false, path: "main.apiKey"},
    {advanced: true, path: "main.dereferer"},
    {advanced: true, path: "main.verifySsl"},
    {advanced: true, path: "main.verifySslDisabledFor"},
    {advanced: true, path: "main.disableSslLocally"},
    {advanced: true, path: "main.sniDisabledFor"},
    {advanced: true, path: "main.useCsrf"},
    // Logging (9), whole fieldset advanced and nested under `main.logging`
    {advanced: true, path: "main.logging.logfilelevel"},
    {advanced: true, path: "main.logging.logMaxHistory"},
    {advanced: true, path: "main.logging.consolelevel"},
    {advanced: true, path: "main.logging.logGc"},
    {advanced: true, path: "main.logging.logIpAddresses"},
    {advanced: true, path: "main.logging.mapIpToHost"},
    {advanced: true, path: "main.logging.logUsername"},
    {advanced: true, path: "main.logging.markersToLog"},
    {advanced: true, path: "main.logging.historyUserInfoType"},
    // Backup (3), whole fieldset advanced
    {advanced: true, path: "main.backupFolder"},
    {advanced: true, path: "main.backupEveryXDays"},
    {advanced: true, path: "main.backupBeforeUpdate"},
    // Updates (5)
    {advanced: false, path: "main.updateAutomatically"},
    {advanced: true, path: "main.updateToPrereleases"},
    {advanced: true, path: "main.deleteBackupsAfterWeeks"},
    {advanced: true, path: "main.showUpdateBannerOnDocker"},
    {advanced: true, path: "main.showWhatsNewBanner"},
    // History (3), whole fieldset advanced
    {advanced: true, path: "main.keepHistory"},
    {advanced: true, path: "main.keepHistoryForWeeks"},
    {advanced: true, path: "main.keepStatsForWeeks"},
    // Database (3), whole fieldset advanced
    {advanced: true, path: "main.databaseCompactTime"},
    {advanced: true, path: "main.databaseRetentionTime"},
    {advanced: true, path: "main.databaseWriteDelay"},
    // Other (8)
    {advanced: false, path: "main.startupBrowser"},
    {advanced: true, path: "main.showNews"},
    {advanced: true, path: "main.disableTour"},
    {advanced: false, path: "main.proxyImages"},
    {advanced: true, path: "main.checkOpenPort"},
    {advanced: true, path: "main.xmx"},
    {advanced: true, path: "main.customVmOptions"},
    {advanced: true, path: "main.scheduledRestartTime"},
];

/** A config in which every one of legacy's `hideExpression`s is satisfied. */
const fullyVisibleConfig: ConfigValues = {
    main: {
        apiKey: "abc123",
        backupBeforeUpdate: true,
        backupEveryXDays: 7,
        backupFolder: "backup",
        checkOpenPort: true,
        customVmOptions: null,
        databaseCompactTime: 15000,
        databaseRetentionTime: 1000,
        databaseWriteDelay: 5000,
        deleteBackupsAfterWeeks: 4,
        dereferer: null,
        disableSslLocally: false,
        disableTour: false,
        host: "0.0.0.0",
        indexerSelectionAsCheckboxes: false,
        keepHistory: true,
        keepHistoryForWeeks: null,
        keepStatsForWeeks: null,
        logging: {
            consolelevel: "DEBUG",
            historyUserInfoType: "NONE",
            logGc: false,
            logIpAddresses: true,
            logMaxHistory: 30,
            logUsername: false,
            logfilelevel: "INFO",
            mapIpToHost: true,
            markersToLog: [],
        },
        port: 5076,
        proxyHost: null,
        proxyIgnoreDomains: [],
        proxyIgnoreLocal: true,
        proxyImages: false,
        proxyPassword: "***UNCHANGED***",
        proxyPort: 1080,
        proxyType: "SOCKS",
        proxyUsername: "***UNCHANGED***",
        scheduledRestartTime: null,
        showNews: true,
        showUpdateBannerOnDocker: true,
        showWhatsNewBanner: true,
        sniDisabledFor: [],
        ssl: true,
        sslKeyStore: "/etc/keystore.jks",
        sslKeyStorePassword: "in-the-clear",
        startupBrowser: true,
        theme: "grey",
        updateAutomatically: false,
        updateToPrereleases: false,
        urlBase: "/",
        useCsrf: false,
        verifySsl: true,
        verifySslDisabledFor: [],
        xmx: 256,
    },
};

type Harness = {form: UseFormReturn<ConfigValues>};

function renderMain({
    showAdvanced = true,
    values = fullyVisibleConfig,
}: {showAdvanced?: boolean; values?: ConfigValues} = {}): Harness {
    const harness = {} as Harness;
    const transport = new ApiTransport(
        "/",
        vi.fn<typeof fetch>(() => {
            throw new Error("no request expected");
        }),
    );
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    function Host() {
        const form = useForm<ConfigValues>({
            defaultValues: structuredClone(values),
            shouldUnregister: false,
        });
        // Handing the form out during render would mutate a value React
        // considers immutable there (`react-hooks/immutability`); the effect
        // has already run by the time `render` returns.
        useEffect(() => {
            harness.form = form;
        }, [form]);
        return (
            <ThemeProvider theme={createHydraTheme("dark")}>
                <QueryClientProvider client={queryClient}>
                    <FormProvider {...form}>
                        <ShowAdvancedContext.Provider value={showAdvanced}>
                            <MainConfigTab transport={transport} />
                        </ShowAdvancedContext.Provider>
                    </FormProvider>
                </QueryClientProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

function visibleSettingPaths(): string[] {
    return screen
        .getAllByTestId(/^config-setting-/)
        .map((element) =>
            (element.getAttribute("data-testid") ?? "")
                .replace("config-setting-", "")
                .replaceAll("-", "."),
        );
}

afterEach(cleanup);

describe("F-CONFIG-MAIN field inventory", () => {
    it("should render all 53 fields of the legacy Main tab", () => {
        renderMain();

        expect(visibleSettingPaths()).toEqual(
            MAIN_FIELDS.map((field) => field.path),
        );
        expect(MAIN_FIELDS).toHaveLength(53);
    });

    it("should group them into legacy's ten fieldsets", () => {
        renderMain();

        expect(
            screen
                .getAllByTestId(/^config-fieldset-(?!tooltip)/)
                .map((element) =>
                    (element.getAttribute("data-testid") ?? "").replace(
                        "config-fieldset-",
                        "",
                    ),
                ),
        ).toEqual([
            "hosting",
            "proxy",
            "ui",
            "security",
            "logging",
            "backup",
            "updates",
            "history",
            "database",
            "other",
        ]);
    });

    it("should bind the Logging fieldset's nine fields under main.logging", () => {
        const harness = renderMain();

        fireEvent.click(screen.getByRole("switch", {name: "Log user names"}));

        const main = harness.form.getValues().main as {
            logging: Record<string, unknown>;
        };
        expect(main.logging.logUsername).toBe(true);
        expect(main).not.toHaveProperty("logUsername");
        // `historyUserInfoType` lives in the Logging fieldset despite its name.
        expect(main.logging.historyUserInfoType).toBe("NONE");
    });

    it("should show only the non-advanced fields while advanced settings are hidden", () => {
        renderMain({showAdvanced: false});

        expect(visibleSettingPaths()).toEqual(
            MAIN_FIELDS.filter((field) => !field.advanced).map(
                (field) => field.path,
            ),
        );
    });
});

describe("F-CONFIG-MAIN conditional fields", () => {
    it("should hide the SSL keystore fields when SSL is off and keep their values", () => {
        const harness = renderMain();
        expect(
            screen.getByTestId("config-setting-main-sslKeyStore"),
        ).toBeVisible();

        fireEvent.click(screen.getByRole("switch", {name: "Use SSL"}));

        expect(
            screen.queryByTestId("config-setting-main-sslKeyStore"),
        ).toBeNull();
        expect(
            screen.queryByTestId("config-setting-main-sslKeyStorePassword"),
        ).toBeNull();
        // The point of the whole exercise: a hidden field is not a cleared one.
        expect(harness.form.getValues().main).toMatchObject({
            ssl: false,
            sslKeyStore: "/etc/keystore.jks",
            sslKeyStorePassword: "in-the-clear",
        });
    });

    it("should hide the proxy fields without a proxy and keep their values", async () => {
        const harness = renderMain();

        fireEvent.mouseDown(screen.getByRole("combobox", {name: "Use proxy"}));
        fireEvent.click(await screen.findByRole("option", {name: "None"}));

        for (const path of [
            "main.proxyHost",
            "main.proxyPort",
            "main.proxyUsername",
            "main.proxyPassword",
            "main.proxyIgnoreLocal",
            "main.proxyIgnoreDomains",
        ]) {
            expect(
                screen.queryByTestId(
                    `config-setting-${path.replaceAll(".", "-")}`,
                ),
            ).toBeNull();
        }
        expect(harness.form.getValues().main).toMatchObject({
            proxyPassword: "***UNCHANGED***",
            proxyPort: 1080,
            proxyType: "NONE",
            proxyUsername: "***UNCHANGED***",
        });
    });

    it("should show the log markers only while a DEBUG level is selected", async () => {
        const harness = renderMain();
        expect(
            screen.getByTestId("config-setting-main-logging-markersToLog"),
        ).toBeVisible();

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Console log level"}),
        );
        fireEvent.click(await screen.findByRole("option", {name: "Info"}));

        expect(
            screen.queryByTestId("config-setting-main-logging-markersToLog"),
        ).toBeNull();
        expect(
            (
                harness.form.getValues().main as {
                    logging: {markersToLog: string[]};
                }
            ).logging.markersToLog,
        ).toEqual([]);
    });

    it("should hide the host mapping switch while IP addresses are not logged", () => {
        renderMain();
        expect(
            screen.getByTestId("config-setting-main-logging-mapIpToHost"),
        ).toBeVisible();

        fireEvent.click(screen.getByRole("switch", {name: "Log IP addresses"}));

        expect(
            screen.queryByTestId("config-setting-main-logging-mapIpToHost"),
        ).toBeNull();
    });

    it("should hide the history retention fields while history is off", () => {
        renderMain();

        fireEvent.click(screen.getByRole("switch", {name: "Keep history"}));

        expect(
            screen.queryByTestId("config-setting-main-keepHistoryForWeeks"),
        ).toBeNull();
        expect(
            screen.queryByTestId("config-setting-main-keepStatsForWeeks"),
        ).toBeNull();
    });

    it("should not block a save on a hidden field's rules", async () => {
        const harness = renderMain({
            values: {
                main: {
                    ...(fullyVisibleConfig.main as Record<string, unknown>),
                    ssl: false,
                    // Required while SSL is on; unset and invisible while off.
                    sslKeyStore: null,
                },
            },
        });

        expect(
            screen.queryByTestId("config-setting-main-sslKeyStore"),
        ).toBeNull();
        expect(await harness.form.trigger()).toBe(true);
    });
});

describe("F-CONFIG-MAIN validation", () => {
    it("should reject an invalid host with legacy's message", async () => {
        const harness = renderMain();

        fireEvent.change(screen.getByTestId("config-input-main-host"), {
            target: {value: "not-an-ip"},
        });

        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId("config-error-main-host"),
        ).toHaveTextContent("not-an-ip is not a valid IP Address");
    });

    it("should reject an invalid scheduled restart time and accept an empty one", async () => {
        const harness = renderMain();
        const input = screen.getByTestId(
            "config-input-main-scheduledRestartTime",
        );

        fireEvent.change(input, {target: {value: "24:00"}});
        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId("config-error-main-scheduledRestartTime"),
        ).toHaveTextContent("24:00 is not a valid time (use HH:mm format)");

        fireEvent.change(input, {target: {value: "03:30"}});
        expect(await harness.form.trigger()).toBe(true);
    });

    it("should reject a non-alphanumeric API key and an empty required one", async () => {
        const harness = renderMain();
        const input = screen.getByTestId("config-input-main-apiKey");

        fireEvent.change(input, {target: {value: "not valid!"}});
        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId("config-error-main-apiKey"),
        ).toHaveTextContent("API key must only contain numbers and digits");

        fireEvent.change(input, {target: {value: ""}});
        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId("config-error-main-apiKey"),
        ).toHaveTextContent("This field is required");
    });

    it("should accept an empty URL base, which legacy wrongly rejected", async () => {
        const harness = renderMain();
        const input = screen.getByTestId("config-input-main-urlBase");

        fireEvent.change(input, {target: {value: ""}});
        expect(await harness.form.trigger()).toBe(true);

        fireEvent.change(input, {target: {value: "nzbhydra/"}});
        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId("config-error-main-urlBase"),
        ).toHaveTextContent("URL base has to start and may not end with /");
    });

    it("should enforce the numeric minimums", async () => {
        const harness = renderMain();

        fireEvent.change(screen.getByTestId("config-input-main-xmx"), {
            target: {value: "64"},
        });
        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId("config-error-main-xmx"),
        ).toHaveTextContent("Must be at least 128");

        fireEvent.change(
            screen.getByTestId("config-input-main-databaseCompactTime"),
            {target: {value: "100"}},
        );
        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId("config-error-main-databaseCompactTime"),
        ).toHaveTextContent("Must be at least 200");
    });
});
