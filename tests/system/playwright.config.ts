import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [["html", {open: "never", outputFolder: "playwright-report"}], ["list"]],
    use: {
        baseURL: "http://127.0.0.1:5076",
        trace: "on-first-retry",
    },

    projects: [
        {
            name: "chromium",
            use: {...devices["Desktop Chrome"]},
        },
    ],

    webServer: {
        command: "echo \"NZBHydra should be running on port 5076\"",
        url: "http://127.0.0.1:5076",
        reuseExistingServer: !process.env.CI,
    },
});