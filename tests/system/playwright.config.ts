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
    // Bounds the whole run, not one test. 300_000 was below the suite's own
    // green runtime -- measured 2026-08-28 at 197 tests in 5.1 minutes -- so a
    // full run ended `timedout` with its reporters unflushed, losing the html
    // and junit output for the run you most wanted to read. This ceiling is
    // only half of it: `--test-timeout` in misc/run_gui_systemtest.py bounds
    // the same invocation from outside and defaulted to the same 300s, so both
    // had to move together.
    globalTimeout: 1_800_000,
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
