import {defineConfig, devices} from "@playwright/test";
import {testEnvironment} from "./tests/environment";

export default defineConfig({
    testDir: "./tests",
    testMatch: "**/*.spec.ts",
    tsconfig: "./tsconfig.json",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    globalTimeout: 300_000,
    reporter: [
        ["html", {open: "never", outputFolder: "playwright-report"}],
        ["list"],
        ["junit", {outputFile: "test-results/junit.xml"}],
    ],
    use: {
        baseURL: testEnvironment.playwrightBaseUrl,
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
