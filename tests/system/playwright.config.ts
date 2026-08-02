import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    testMatch: "**/*.spec.ts",
    tsconfig: "./tsconfig.json",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [
        ["html", {open: "never", outputFolder: "playwright-report"}],
        ["list"],
        ["junit", {outputFile: "test-results/junit.xml"}],
    ],
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5076",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },

    projects: [
        {
            name: "chromium",
            use: {...devices["Desktop Chrome"]},
        },
    ],

});
